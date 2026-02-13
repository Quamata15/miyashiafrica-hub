import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { filterMessage } from "@/utils/messageFilter";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  otherUser?: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  lastMessage?: string;
  unreadCount?: number;
}

export const useChat = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convs) return;

    const enriched = await Promise.all(
      convs.map(async (conv) => {
        const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;

        const [profileRes, lastMsgRes, unreadRes] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, avatar_url").eq("user_id", otherUserId).maybeSingle(),
          supabase.from("messages").select("content").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("messages").select("*", { count: "exact", head: true }).eq("conversation_id", conv.id).eq("receiver_id", user.id).eq("is_read", false),
        ]);

        return {
          ...conv,
          otherUser: profileRes.data
            ? { id: profileRes.data.user_id, full_name: profileRes.data.full_name || "Utilisateur", avatar_url: profileRes.data.avatar_url || "" }
            : { id: otherUserId, full_name: "Utilisateur", avatar_url: "" },
          lastMessage: lastMsgRes.data?.content,
          unreadCount: unreadRes.count || 0,
        };
      })
    );

    setConversations(enriched);
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
      // Mark as read
      if (user) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .eq("receiver_id", user.id);
      }
    }
  }, [user]);

  const sendMessage = useCallback(async (content: string): Promise<boolean | string> => {
    if (!content.trim() || !selectedConversation || !user) return false;

    // Firewall: block contact sharing
    const filterResult = filterMessage(content.trim());
    if (filterResult.blocked) {
      return filterResult.reason || "Message bloqué";
    }

    const otherUserId = selectedConversation.participant_1 === user.id
      ? selectedConversation.participant_2
      : selectedConversation.participant_1;

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      receiver_id: otherUserId,
      content: content.trim(),
    });

    if (!error) {
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
      return true;
    }
    return false;
  }, [selectedConversation, user]);

  const startConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;

    // Check existing
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ participant_1: user.id, participant_2: otherUserId })
      .select()
      .single();

    return newConv?.id || null;
  }, [user]);

  // Real-time message subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`chat-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (selectedConversation?.id === newMsg.conversation_id) {
            setMessages((prev) => [...prev, newMsg]);
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedConversation, fetchConversations]);

  // Typing indicator via presence
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const channel = supabase.channel(`typing-${selectedConversation.id}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const otherUserId = selectedConversation.participant_1 === user.id
          ? selectedConversation.participant_2
          : selectedConversation.participant_1;
        const isOtherTyping = Object.keys(state).some(
          (key) => key === otherUserId && (state[key] as any)?.[0]?.typing
        );
        setOtherUserTyping(isOtherTyping);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  const sendTypingIndicator = useCallback(() => {
    if (!selectedConversation || !user) return;
    
    setIsTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
  }, [selectedConversation, user]);

  return {
    conversations,
    messages,
    selectedConversation,
    isTyping,
    otherUserTyping,
    setSelectedConversation,
    fetchConversations,
    fetchMessages,
    sendMessage,
    startConversation,
    sendTypingIndicator,
  };
};

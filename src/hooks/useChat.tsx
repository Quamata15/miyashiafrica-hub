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

    // Fetch conversations
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convs || convs.length === 0) return;

    // Batch: collect all other user IDs
    const otherUserIds = convs.map((c) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1
    );
    const convIds = convs.map((c) => c.id);

    // Parallel batch queries instead of N+1
    const [profilesRes, lastMsgsRes, unreadRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", otherUserIds),
      supabase.from("messages").select("conversation_id, content, created_at").in("conversation_id", convIds).order("created_at", { ascending: false }),
      supabase.from("messages").select("conversation_id", { count: "exact" }).in("conversation_id", convIds).eq("receiver_id", user.id).eq("is_read", false),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
    
    // Get last message per conversation
    const lastMsgMap = new Map<string, string>();
    for (const msg of lastMsgsRes.data || []) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg.content);
      }
    }

    // Count unread per conversation (approximation from grouped data)
    const unreadMap = new Map<string, number>();
    for (const msg of (unreadRes as any).data || []) {
      unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) || 0) + 1);
    }

    const enriched = convs.map((conv) => {
      const otherUserId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;
      const profile = profileMap.get(otherUserId);
      return {
        ...conv,
        otherUser: profile
          ? { id: profile.user_id, full_name: profile.full_name || "Utilisateur", avatar_url: profile.avatar_url || "" }
          : { id: otherUserId, full_name: "Utilisateur", avatar_url: "" },
        lastMessage: lastMsgMap.get(conv.id),
        unreadCount: unreadMap.get(conv.id) || 0,
      };
    });

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

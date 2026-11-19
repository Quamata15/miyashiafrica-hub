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
  message_type: string;
  attachment_url: string | null;
  attachment_name: string | null;
  location_data: any | null;
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

    if (!convs || convs.length === 0) return;

    const otherUserIds = convs.map((c) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1
    );
    const convIds = convs.map((c) => c.id);

    const [profilesRes, lastMsgsRes, unreadRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", otherUserIds),
      supabase.from("messages").select("conversation_id, content, message_type, created_at").in("conversation_id", convIds).order("created_at", { ascending: false }),
      supabase.from("messages").select("conversation_id", { count: "exact" }).in("conversation_id", convIds).eq("receiver_id", user.id).eq("is_read", false),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
    
    const lastMsgMap = new Map<string, string>();
    for (const msg of lastMsgsRes.data || []) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        const msgType = (msg as { message_type?: string }).message_type;
        const preview = msgType === 'image' ? '📷 Photo' :
                       msgType === 'file' ? '📎 Fichier' :
                       msgType === 'location' ? '📍 Position' :
                       msg.content;
        lastMsgMap.set(msg.conversation_id, preview);
      }
    }

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
      setMessages(data as unknown as Message[]);
      if (user) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .eq("receiver_id", user.id);
      }
    }
  }, [user]);

  const sendMessage = useCallback(async (
    content: string,
    options?: {
      message_type?: string;
      attachment_url?: string;
      attachment_name?: string;
      location_data?: { lat: number; lng: number; label?: string };
    }
  ): Promise<boolean | string> => {
    if (!selectedConversation || !user) return false;

    const messageType = options?.message_type || 'text';
    
    // Only filter text messages
    if (messageType === 'text') {
      if (!content.trim()) return false;
      const filterResult = filterMessage(content.trim());
      if (filterResult.blocked) {
        return filterResult.reason || "Message bloqué";
      }
    }

    const otherUserId = selectedConversation.participant_1 === user.id
      ? selectedConversation.participant_2
      : selectedConversation.participant_1;

    const insertData: any = {
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      receiver_id: otherUserId,
      content: content.trim() || (messageType === 'image' ? '📷 Photo' : messageType === 'file' ? '📎 Fichier' : '📍 Position'),
      message_type: messageType,
    };

    if (options?.attachment_url) insertData.attachment_url = options.attachment_url;
    if (options?.attachment_name) insertData.attachment_name = options.attachment_name;
    if (options?.location_data) insertData.location_data = options.location_data;

    const { error } = await supabase.from("messages").insert(insertData);

    if (!error) {
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConversation.id);
      return true;
    }
    return false;
  }, [selectedConversation, user]);

  const uploadAttachment = useCallback(async (file: File): Promise<{ url: string; name: string } | null> => {
    if (!user || !selectedConversation) return null;

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${selectedConversation.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, file);

    if (error) return null;

    const { data: urlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    // Since bucket is private, use createSignedUrl
    const { data: signedData } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    return {
      url: signedData?.signedUrl || urlData.publicUrl,
      name: file.name,
    };
  }, [user, selectedConversation]);

  const startConversation = useCallback(async (otherUserId: string) => {
    if (!user) return null;

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
      .channel(`chat-${user.id}-${crypto.randomUUID()}`)
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
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!selectedConversation || !user) return;

    const channel = supabase.channel(`typing-${selectedConversation.id}`, {
      config: { presence: { key: user.id } },
    });

    typingChannelRef.current = channel;

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
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ typing: false });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [selectedConversation, user]);

  const sendTypingIndicator = useCallback(async () => {
    if (!selectedConversation || !user || !typingChannelRef.current) return;
    
    // Push typing=true to presence
    await typingChannelRef.current.track({ typing: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      // Push typing=false after 2s of inactivity
      if (typingChannelRef.current) {
        await typingChannelRef.current.track({ typing: false });
      }
    }, 2000);
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
    uploadAttachment,
    startConversation,
    sendTypingIndicator,
  };
};

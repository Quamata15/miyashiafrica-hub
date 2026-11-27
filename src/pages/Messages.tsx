import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import ChatAttachmentMenu from "@/components/chat/ChatAttachmentMenu";
import { QuickReplies, VideoCallButton, VoiceRecorder } from "@/components/chat/ChatExtras";
import { QuoteDialog } from "@/components/commerce/Services";
import { useSpaces } from "@/hooks/useSpaces";
import { usePrefs } from "@/lib/prefs";
import EmojiPicker from "@/components/chat/EmojiPicker";
import {
  MessageSquare, Search, Send, MoreVertical,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const Messages = () => {
  const { flag } = usePrefs();
  const { user, loading: authLoading } = useAuth();
  const sp = useSpaces();
  const navigate = useNavigate();
  const {
    conversations, messages, selectedConversation,
    otherUserTyping, setSelectedConversation,
    fetchConversations, fetchMessages, sendMessage, uploadAttachment, sendTypingIndicator,
  } = useChat();
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isMobileViewingChat, setIsMobileViewingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchConversations();
  }, [user, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) fetchMessages(selectedConversation.id);
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    const result = await sendMessage(newMessage);
    if (result === true) {
      setNewMessage("");
    } else if (typeof result === "string") {
      toast.error(result);
    }
    setSending(false);
  };

  const handleSendImage = async (file: File) => {
    setUploading(true);
    const result = await uploadAttachment(file);
    if (result) {
      await sendMessage("", { message_type: "image", attachment_url: result.url, attachment_name: result.name });
    } else {
      toast.error("Erreur lors de l'envoi de l'image");
    }
    setUploading(false);
  };

  const handleSendFile = async (file: File) => {
    setUploading(true);
    const result = await uploadAttachment(file);
    if (result) {
      await sendMessage("", { message_type: "file", attachment_url: result.url, attachment_name: result.name });
    } else {
      toast.error("Erreur lors de l'envoi du fichier");
    }
    setUploading(false);
  };

  const handleSendLocation = async (lat: number, lng: number, label?: string) => {
    await sendMessage("", { message_type: "location", location_data: { lat, lng, label } });
  };

  const handleSelectConversation = (conv: any) => {
    setSelectedConversation(conv);
    setIsMobileViewingChat(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-warm">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-200px)]">
          <Card className="h-full overflow-hidden border-0 shadow-elevated">
            <div className="flex h-full">
              {/* Conversations List */}
              <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col ${isMobileViewingChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-border bg-card">
                  <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Messages
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {conversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Aucune conversation</p>
                      <p className="text-sm mt-2">Contactez un vendeur depuis un produit</p>
                    </div>
                  ) : (
                    conversations
                      .filter((conv) => conv.otherUser?.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((conv) => (
                        <motion.div
                          key={conv.id}
                          whileHover={{ backgroundColor: "hsl(var(--muted))" }}
                          className={`p-4 cursor-pointer border-b border-border/50 transition-colors ${selectedConversation?.id === conv.id ? "bg-primary/5" : ""}`}
                          onClick={() => handleSelectConversation(conv)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={conv.otherUser?.avatar_url} />
                                <AvatarFallback className="bg-gradient-hero text-primary-foreground">
                                  {conv.otherUser?.full_name?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-accent border-2 border-card" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold truncate">{conv.otherUser?.full_name || "Utilisateur"}</p>
                                <span className="text-xs text-muted-foreground">
                                  {conv.last_message_at ? format(new Date(conv.last_message_at), "HH:mm", { locale: fr }) : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-sm text-muted-foreground truncate">{conv.lastMessage || "..."}</p>
                                {conv.unreadCount && conv.unreadCount > 0 && (
                                  <Badge className="ml-2 bg-secondary text-secondary-foreground h-5 w-5 p-0 flex items-center justify-center text-xs">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                  )}
                </ScrollArea>
              </div>

              {/* Chat Area */}
              <div className={`flex-1 flex flex-col ${!isMobileViewingChat ? "hidden md:flex" : "flex"}`}>
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileViewingChat(false)}>
                          <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={selectedConversation.otherUser?.avatar_url} />
                          <AvatarFallback className="bg-gradient-hero text-primary-foreground">
                            {selectedConversation.otherUser?.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{selectedConversation.otherUser?.full_name || "Utilisateur"}</p>
                          {otherUserTyping && <p className="text-xs text-accent">En train d'écrire…</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {flag("video_calls") && <VideoCallButton send={sendMessage} />}
                        {flag("quotes") && user && sp.can("provide") && <QuoteDialog clientId={selectedConversation.participant_1 === user.id ? selectedConversation.participant_2 : selectedConversation.participant_1} />}
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <ChatMessageBubble
                            key={message.id}
                            message={message}
                            isOwn={message.sender_id === user?.id}
                          />
                        ))}
                        {otherUserTyping && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-muted rounded-2xl px-4 py-3 rounded-bl-sm">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t border-border bg-card">
                      <QuickReplies onPick={(t) => setNewMessage(t)} />
                      <div className="flex items-center gap-2">
                        <ChatAttachmentMenu
                          onSendImage={handleSendImage}
                          onSendFile={handleSendFile}
                          onSendLocation={handleSendLocation}
                          uploading={uploading}
                        />
                        <Input
                          placeholder="Écrivez votre message..."
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            sendTypingIndicator();
                          }}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                          className="flex-1"
                        />
                        <EmojiPicker onEmojiSelect={(emoji) => setNewMessage(prev => prev + emoji)} />
                        {flag("voice_messages") && !newMessage.trim() && <VoiceRecorder upload={uploadAttachment} send={sendMessage} />}
                        <Button
                          onClick={handleSend}
                          disabled={!newMessage.trim() || sending}
                          className="bg-gradient-hero shrink-0"
                          size="icon"
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                        <MessageSquare className="h-12 w-12 opacity-50" />
                      </div>
                      <p className="text-lg font-display font-semibold">Sélectionnez une conversation</p>
                      <p className="text-sm mt-2">Choisissez un contact pour discuter</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;

import { Check, CheckCheck, MapPin, Download, FileText, Video } from "lucide-react";
import { TranslateMessage } from "./ChatExtras";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface ChatMessageBubbleProps {
  message: {
    id: string;
    sender_id: string;
    content: string;
    message_type: string;
    attachment_url: string | null;
    attachment_name: string | null;
    location_data: any | null;
    is_read: boolean;
    created_at: string;
  };
  isOwn: boolean;
}

const ChatMessageBubble = ({ message, isOwn }: ChatMessageBubbleProps) => {
  const renderContent = () => {
    switch (message.message_type) {
      case 'image':
        return (
          <div className="space-y-1">
            {message.attachment_url && (
              <a href={message.attachment_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={message.attachment_url}
                  alt="Photo"
                  className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </a>
            )}
            {message.content && message.content !== '📷 Photo' && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        );

      case 'file':
        return (
          <a
            href={message.attachment_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background/80'
            }`}
          >
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{message.attachment_name || 'Fichier'}</p>
              <p className="text-xs opacity-70">Télécharger</p>
            </div>
            <Download className="h-4 w-4 shrink-0 opacity-60" />
          </a>
        );

      case 'location': {
        const loc = message.location_data;
        if (!loc) return <p className="text-sm">{message.content}</p>;
        return (
          <a
            href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-2 rounded-lg transition-colors ${
              isOwn ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-background/50 hover:bg-background/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">{loc.label || 'Position partagée'}</span>
            </div>
            <div className="rounded-md overflow-hidden bg-muted h-24 flex items-center justify-center">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=15&size=300x120&markers=color:red%7C${loc.lat},${loc.lng}&key=`}
                alt="Map"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute text-xs text-muted-foreground">
                📍 {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
              </div>
            </div>
          </a>
        );
      }
      case 'audio':
        return message.attachment_url ? (
          <audio controls preload="none" src={message.attachment_url} className="max-w-[240px] h-10" aria-label="Message vocal" />
        ) : <p className="text-sm">{message.content}</p>;

      case 'video_call':
        return (
          <a href={message.attachment_url || '#'} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-3 p-2 rounded-lg ${isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'}`}>
            <span className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center"><Video className="h-5 w-5 text-accent" /></span>
            <span className="text-sm font-medium">Appel vidéo<span className="block text-xs opacity-70">Rejoindre l'appel</span></span>
          </a>
        );

      case 'service_request':
      case 'quote':
        return (
          <div className={`rounded-lg p-2 ${isOwn ? 'bg-primary-foreground/10' : 'bg-background/50'}`}>
            <p className="text-sm whitespace-pre-line break-words">{message.content}</p>
            {message.message_type === 'quote' && (
              <Link to="/quotes" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline">
                <FileText className="h-3.5 w-3.5" />{isOwn ? 'Voir mes devis' : 'Lire les termes et payer en séquestre'}
              </Link>
            )}
          </div>
        );

      default:
        return (<>
          <p className="text-sm whitespace-pre-line break-words">{message.content}</p>
          {!isOwn && message.content && message.content.length > 1 && <TranslateMessage messageId={message.id} />}
        </>);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? "bg-gradient-hero text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        }`}
      >
        {renderContent()}
        <div className={`flex items-center justify-end gap-1 mt-1 ${
          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
        }`}>
          <span className="text-xs">{format(new Date(message.created_at), "HH:mm")}</span>
          {isOwn && (
            message.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessageBubble;

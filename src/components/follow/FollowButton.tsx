import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useFollow } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  userId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showCount?: boolean;
}

const FollowButton = ({ 
  userId, 
  variant = "default", 
  size = "default",
  className,
  showCount = false 
}: FollowButtonProps) => {
  const { user } = useAuth();
  const { isFollowing, followersCount, loading, toggleFollow } = useFollow(userId);

  // Don't show follow button for own profile
  if (user?.id === userId) return null;

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      onClick={toggleFollow}
      disabled={loading}
      className={cn(
        isFollowing && "border-primary text-primary",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          Abonné
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          S'abonner
        </>
      )}
      {showCount && followersCount > 0 && (
        <span className="ml-1">({followersCount})</span>
      )}
    </Button>
  );
};

export default FollowButton;

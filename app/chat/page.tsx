import ChatInput from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";
import LogoutButton from "@/components/LogoutButton";

export default function ChatPage() {
  return (
    <div>
      <LogoutButton />
      <ChatMessages />
      <ChatInput />
    </div>
  );
}
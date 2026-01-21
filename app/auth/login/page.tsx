import { Background } from "@/components/Background";
import { Auth } from "@/components/Auth";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative p-4">
            <Background />
            <Auth />
        </div>
    )
}

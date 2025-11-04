import { HeaderBar } from "./landing/HeaderBar.tsx";
import { Hero } from "./landing/Hero.tsx";
import { PublicCard } from "./landing/PublicCard.tsx";
import { PrivateCard } from "./landing/PrivateCard.tsx";

interface LandingPageProps {
  onJoinPublic: () => void;
  onCreatePrivate: () => void;
  onJoinWithLink: (value: string) => void;
}

export function LandingPage({ onJoinPublic, onCreatePrivate, onJoinWithLink }: LandingPageProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center px-4 py-6 text-sky-100">
      <div className="w-full max-w-5xl">
        <HeaderBar />
        <Hero />
        <div className="mt-6 space-y-6">
          <PublicCard onJoinPublic={onJoinPublic} />
          <PrivateCard onCreatePrivate={onCreatePrivate} onJoinWithLink={onJoinWithLink} />
        </div>
      </div>
    </div>
  );
}

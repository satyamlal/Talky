import { TalkyLogo } from "../icons/TalkyLogo.tsx";

export function HeaderBar() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between rounded-2xl bg-[#0b1220]/80 border border-[#25304a] px-4 py-3 backdrop-blur-sm lg:static">
      <div className="flex items-center gap-3">
        <TalkyLogo className="h-8 w-8" />
        <span className="text-xl font-semibold text-sky-100">Talky</span>
      </div>
      <button className="px-4 py-2 rounded-xl bg-[#1b2438] border border-[#2d3958] text-sky-200 hover:bg-[#202a42]">
        Login/Signup
      </button>
    </div>
  );
}

export function HeaderBar() {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#0b1220]/80 border border-[#25304a] px-4 py-3">
      <div className="flex items-center gap-3">
        <img
          src="/talky-sm.png"
          srcSet="/talky-sm.png 1x, /talky-md.png 2x"
          alt="Talky"
          className="h-8 w-8 rounded"
        />
        <span className="text-xl font-semibold text-sky-100">Talky</span>
      </div>
      <button className="px-4 py-2 rounded-xl bg-[#1b2438] border border-[#2d3958] text-sky-200 hover:bg-[#202a42]">
        Login/Signup
      </button>
    </div>
  );
}

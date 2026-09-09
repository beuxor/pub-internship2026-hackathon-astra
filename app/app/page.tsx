export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12">
      <h1 className="text-5xl font-bold tracking-tight">始まるよ</h1>
      <button className="rounded-full bg-foreground px-10 py-4 text-lg font-semibold text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">
        スタート
      </button>
    </div>
  );
}

export function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        transform="rotate(90 12 12)"
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round" />
    </svg>
  );
}

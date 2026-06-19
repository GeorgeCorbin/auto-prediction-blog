interface SearchFormProps {
  defaultQuery?: string;
  className?: string;
}

export function SearchForm({ defaultQuery = '', className = '' }: SearchFormProps) {
  return (
    <form
      action="/search"
      method="get"
      role="search"
      className={`flex items-center gap-2 bg-[#F3F4F6] rounded px-3 py-2 min-w-0 ${className}`}
    >
      <svg
        className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search predictions..."
        aria-label="Search predictions"
        className="bg-transparent border-0 outline-none text-[13px] text-[#1A1A1A] placeholder:text-[#9CA3AF] w-full min-w-0 sm:w-48 md:w-56"
      />
    </form>
  );
}

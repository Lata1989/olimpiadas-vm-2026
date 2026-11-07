import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-border/70">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-2 px-4 py-4 lg:flex-row lg:justify-between lg:gap-8 lg:px-8 lg:py-5">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Olimpiadas de Programación VM 2026, inicio"
        >
          <Image
            src="/logos/logo-educacion-blanco.png"
            alt="Educación"
            width={1200}
            height={272}
            className="h-12 w-[212px] object-contain sm:h-16 sm:w-[280px]"
            priority
          />
          <span
            aria-label="Instituto Leibniz"
            className="relative block h-[58px] w-[82px] shrink-0 overflow-hidden sm:h-[78px] sm:w-[140px]"
          >
            <Image
              src="/logos/Logo%20vector%20blanco.png"
              alt="Instituto Leibniz"
              width={1080}
              height={1080}
              className="absolute left-1/2 top-1/2 h-[180px] w-[180px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:h-[300px] sm:w-[300px]"
              priority
            />
          </span>
        </Link>
        <div
          aria-label="Cultura LBZ y Tecnológica"
          className="flex items-center gap-3 sm:gap-5"
        >
          <span
            aria-label="Cultura LBZ"
            className="relative block h-[82px] w-[132px] shrink-0 overflow-hidden sm:h-[96px] sm:w-[154px]"
          >
            <Image
              src="/logos/cultura%20lbz%20blanco.svg"
              alt="Cultura LBZ"
              width={1080}
              height={1080}
              className="absolute left-1/2 top-1/2 h-[156px] w-[156px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain sm:h-[166px] sm:w-[166px]"
              priority
            />
          </span>
          <Image
            src="/logos/image.png"
            alt="Tecnológica"
            width={1580}
            height={492}
            className="h-[54px] w-[172px] object-contain sm:h-[72px] sm:w-[232px]"
            priority
          />
        </div>
      </div>
    </header>
  );
}

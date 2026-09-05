import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-auto md:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <article
      className={cn(
        "group/bento row-span-1 flex min-h-72 flex-col justify-between gap-6 rounded-xl border bg-card p-6 transition-colors duration-150 hover:border-input",
        className,
      )}
    >
      {header}
      <div>
        <span className="text-primary [&>svg]:size-5" aria-hidden="true">
          {icon}
        </span>
        <h3 className="mt-3 mb-2 font-sans font-semibold text-foreground">
          {title}
        </h3>
        <div className="font-sans text-sm leading-6 font-normal text-muted-foreground">
          {description}
        </div>
      </div>
    </article>
  );
};

"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

type Props = VariantProps<typeof buttonVariants> &
  React.ComponentPropsWithoutRef<typeof Link> & {
    children: React.ReactNode;
  };

export function ButtonLink({ href, variant, size, className, children, ...props }: Props) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}

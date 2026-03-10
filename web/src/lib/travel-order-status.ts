export const STATUS_LABELS: Record<string, string> = {
  draft: "Nacrt",
  approved: "Odobren",
  completed: "Završen",
  cancelled: "Otkazan",
};

export const STATUS_VARIANT: Record<
  string,
  "secondary" | "outline" | "default" | "destructive"
> = {
  draft: "outline",
  approved: "secondary",
  completed: "default",
  cancelled: "destructive",
};

export const STATUS_CLASS: Record<string, string> = {
  draft: "",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

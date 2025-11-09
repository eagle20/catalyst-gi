'use client';

import { Badge } from '@/vibes/soul/primitives/badge';
import { Gift } from 'lucide-react';

interface FreeToolOption {
  productId: number;
  variantId?: number;
  name: string;
  imageUrl?: string;
}

interface FreeToolSelectorProps {
  tools: FreeToolOption[];
  onSelect: (productId: number, variantId?: number) => void;
  selectedToolId?: number;
  error?: string;
}

export function FreeToolSelector({
  tools,
  onSelect,
  selectedToolId,
  error,
}: FreeToolSelectorProps) {
  if (!tools || tools.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-success/20 bg-success-highlight/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
          <Gift className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">FREE TOOL INCLUDED!</h3>
          <p className="text-sm text-contrast-400">
            Choose your free tool below when you purchase this battery
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Select Your Free Tool<span className="text-error">*</span>
        </label>

        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @lg:grid-cols-3">
          {tools.map((tool) => {
            const isSelected = selectedToolId === tool.productId;

            return (
              <button
                key={`${tool.productId}-${tool.variantId || 'default'}`}
                type="button"
                onClick={() => onSelect(tool.productId, tool.variantId)}
                className={`
                  relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all
                  ${
                    isSelected
                      ? 'border-success bg-success/5 shadow-md'
                      : 'border-contrast-100 bg-background hover:border-contrast-200'
                  }
                `}
              >
                {tool.imageUrl && (
                  <div className="relative aspect-square w-full overflow-hidden rounded">
                    <img
                      src={tool.imageUrl}
                      alt={tool.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <p className="text-center text-sm font-medium text-foreground">{tool.name}</p>

                <Badge variant="success" shape="pill">
                  FREE
                </Badge>

                {isSelected && (
                  <div className="absolute right-2 top-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
                      <span className="text-xs font-bold">✓</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}

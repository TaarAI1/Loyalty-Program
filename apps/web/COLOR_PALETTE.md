# Loyalty Plus — Web App Color Palette

Updated from **Loyalty_Plus_Branding.pdf** (AKMAL-DEV theme).

Sources:

- Branding PDF color specifications
- `apps/web/src/app/globals.css`
- `apps/web/tailwind.config.ts`

---

## Brand core (from PDF)

| Token | Hex | RGB | Usage |
| --- | --- | --- | --- |
| Deep navy | `#000820` | 0, 8, 32 | Main dark background, ink, sidebar |
| Navy blue | `#001020` | 0, 16, 32 | Secondary background / gradient |
| Warm white | `#F8F8F8` | 248, 248, 248 | Page background, light surfaces |
| Lime green | `#D0F878` | 208, 248, 120 | Primary accent, CTAs, active states |
| Electric blue | `#88C8FF` | 136, 200, 255 | Glow / highlight accents |
| Muted blue | `#487898` | 72, 120, 152 | Dividers, section labels |
| Logo green | `#B9EB32` | 185, 235, 50 | Logo reference / hover accent |

---

## Derived UI tokens

| Token | Hex | Usage |
| --- | --- | --- |
| Brand light | `#E8FFA0` | Lighter lime |
| Brand wash | `#F4FCE3` | Soft lime backgrounds |
| Brand text on wash | `#3F5A10` | Text on lime wash |
| Field border | `#D0DCE6` | Inputs / cards |
| Field fill | `#F5F7FA` | Input background |
| Hover gray | `#E2EAF0` | Secondary hover |

---

## CSS variables (`globals.css`)

| Variable | HSL | Approx hex |
| --- | --- | --- |
| `--background` | `0 0% 97%` | `#F8F8F8` |
| `--foreground` | `225 100% 6%` | `#000820` |
| `--primary` | `79 90% 72%` | `#D0F878` |
| `--primary-foreground` | `225 100% 6%` | `#000820` |
| `--accent` | `79 90% 72%` | `#D0F878` |
| `--muted-foreground` | ~ muted blue | `#487898` range |
| `--ring` | `79 90% 72%` | `#D0F878` |
| `--destructive` | `0 84% 60%` | `#F04444` |

---

## Typography (from PDF)

| Role | Font |
| --- | --- |
| UI / labels | **DM Sans** (app default) |
| Marketing heading match | Bodoni Moda (promo only; not used in app chrome) |
| Fallback | Inter |

---

## Quick swatches

```
#000820  deep navy
#001020  navy secondary
#F8F8F8  warm white
#D0F878  lime green (primary)
#B9EB32  logo green (hover)
#88C8FF  electric blue
#487898  muted blue
#F4FCE3  lime wash
```

# Shadcn

Remember that the `shadcn-ui` cli has been replaced by `shadcn`.

## Installation

```bash
npx shadcn@latest init -d # use defaults
```

## Adding and using Components

Example: Adding a button

```bash
npx shadcn@latest add button
```

Then, use it like

```bash
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div>
      <Button>Click me</Button>
    </div>
  )
}
```

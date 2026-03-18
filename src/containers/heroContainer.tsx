'use client'

import { HeroUIProvider } from '@heroui/react'
import type { ReactNode } from 'react';

function HeroContainer({ children }: {children:ReactNode}) {
  return (
    <HeroUIProvider>
          {children}
    </HeroUIProvider>
  )
}

export default HeroContainer;

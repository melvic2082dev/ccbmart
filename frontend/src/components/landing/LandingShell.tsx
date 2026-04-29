'use client';

import './landing.css';
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Sections';
import type { Category } from './categories';

export function LandingShell({ children, categories }: { children: ReactNode; categories?: Category[] }) {
  return (
    <div className="ccb-landing">
      <Header cartCount={0} categories={categories} />
      {children}
      <Footer />

      <style>{`
        @media (max-width: 880px) {
          .ccb-hero-grid { grid-template-columns: 1fr !important; }
          .ccb-hero-visual { height: 460px !important; }
          .ccb-promo-grid { grid-template-columns: 1fr !important; }
          .ccb-footer-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .ccb-2col, .ccb-product-detail, .ccb-stores-grid, .ccb-cart-grid, .ccb-about-hero {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 540px) {
          .ccb-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

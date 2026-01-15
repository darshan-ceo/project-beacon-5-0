import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
    	container: {
    		center: true,
    		padding: '2rem',
    		screens: {
    			'2xl': '1400px'
    		}
    	},
    	extend: {
    		screens: {
    			xs: '475px'
    		},
		fontFamily: {
			sans: [
				'-apple-system',
				'BlinkMacSystemFont',
				'"SF Pro Text"',
				'"SF Pro Display"',
				'"Segoe UI"',
				'Roboto',
				'Helvetica',
				'Arial',
				'sans-serif'
			],
			display: [
				'-apple-system',
				'BlinkMacSystemFont',
				'"SF Pro Display"',
				'"Segoe UI"',
				'Roboto',
				'Helvetica',
				'Arial',
				'sans-serif'
			],
			mono: [
				'"SF Mono"',
				'SFMono-Regular',
				'ui-monospace',
				'Menlo',
				'Monaco',
				'Consolas',
				'"Liberation Mono"',
				'monospace'
			]
		},
		fontSize: {
			h1: [
				'28px',
				{
					lineHeight: '36px',
					fontWeight: '600',
					letterSpacing: '-0.02em'
				}
			],
			h2: [
				'22px',
				{
					lineHeight: '28px',
					fontWeight: '600',
					letterSpacing: '-0.01em'
				}
			],
			h3: [
				'18px',
				{
					lineHeight: '24px',
					fontWeight: '500',
					letterSpacing: '-0.01em'
				}
			],
			h4: [
				'15px',
				{
					lineHeight: '20px',
					fontWeight: '500'
				}
			],
			body: [
				'14px',
				{
					lineHeight: '22px',
					fontWeight: '400'
				}
			],
			'body-lg': [
				'16px',
				{
					lineHeight: '24px',
					fontWeight: '400'
				}
			],
			small: [
				'13px',
				{
					lineHeight: '18px',
					fontWeight: '400'
				}
			],
			caption: [
				'12px',
				{
					lineHeight: '16px',
					fontWeight: '500'
				}
			],
			xs: [
				'11px',
				{
					lineHeight: '14px',
					fontWeight: '400'
				}
			]
		},
    		borderRadius: {
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		maxWidth: {
    			'beacon-modal': '650px',
    			'beacon-container': '1200px'
    		},
    		spacing: {
    			'beacon-section': '24px',
    			'beacon-field': '16px',
    			'beacon-compact': '12px'
    		},
    		colors: {
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))',
    				hover: 'hsl(var(--primary-hover))',
    				light: 'hsl(var(--primary-light))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))',
    				hover: 'hsl(var(--secondary-hover))',
    				light: 'hsl(var(--secondary-light))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))',
    				partial: 'hsl(var(--success-partial))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))'
    			},
    			info: {
    				DEFAULT: 'hsl(var(--info))',
    				foreground: 'hsl(var(--info-foreground))'
    			},
    			pending: {
    				DEFAULT: 'hsl(var(--pending))',
    				foreground: 'hsl(var(--pending-foreground))'
    			},
    			stage: {
    				draft: 'hsl(var(--stage-draft))',
    				'draft-bg': 'hsl(var(--stage-draft-bg))',
    				hearing: 'hsl(var(--stage-hearing))',
    				'hearing-bg': 'hsl(var(--stage-hearing-bg))',
    				order: 'hsl(var(--stage-order))',
    				'order-bg': 'hsl(var(--stage-order-bg))',
    				appeal: 'hsl(var(--stage-appeal))',
    				'appeal-bg': 'hsl(var(--stage-appeal-bg))'
    			},
    			alert: {
    				critical: 'hsl(var(--alert-critical))',
    				important: 'hsl(var(--alert-important))',
    				neutral: 'hsl(var(--alert-neutral))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			sidebar: {
    				DEFAULT: 'hsl(var(--sidebar-background))',
    				foreground: 'hsl(var(--sidebar-foreground))',
    				primary: 'hsl(var(--sidebar-primary))',
    				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
    				accent: 'hsl(var(--sidebar-accent))',
    				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
    				border: 'hsl(var(--sidebar-border))',
    				ring: 'hsl(var(--sidebar-ring))'
    			},
    			legal: {
    				urgent: 'hsl(var(--legal-urgent))',
    				pending: 'hsl(var(--legal-pending))',
    				approved: 'hsl(var(--legal-approved))',
    				draft: 'hsl(var(--legal-draft))'
    			},
    			vibrant: {
    				green: {
    					DEFAULT: 'hsl(174 100% 38%)',
    					light: 'hsl(174 100% 45%)',
    					dark: 'hsl(174 80% 30%)'
    				},
    				blue: {
    					DEFAULT: 'hsl(217 100% 52%)',
    					light: 'hsl(188 100% 50%)',
    					dark: 'hsl(217 80% 40%)'
    				},
    				cyan: {
    					DEFAULT: 'hsl(188 100% 50%)',
    					light: 'hsl(174 100% 45%)',
    					dark: 'hsl(188 80% 40%)'
    				},
    				purple: {
    					DEFAULT: 'hsl(258 90% 66%)',
    					light: 'hsl(266 85% 75%)',
    					dark: 'hsl(258 80% 50%)'
    				},
    				teal: {
    					DEFAULT: 'hsl(173 80% 40%)',
    					light: 'hsl(174 100% 38%)',
    					dark: 'hsl(173 80% 30%)'
    				},
    				amber: {
    					DEFAULT: 'hsl(38 92% 50%)',
    					light: 'hsl(25 95% 53%)',
    					dark: 'hsl(38 80% 40%)'
    				},
    				red: {
    					DEFAULT: 'hsl(0 84% 60%)',
    					light: 'hsl(0 72% 51%)',
    					dark: 'hsl(0 80% 45%)'
    				},
    				orange: {
    					DEFAULT: 'hsl(25 95% 53%)',
    					light: 'hsl(38 92% 50%)',
    					dark: 'hsl(25 80% 45%)'
    				},
    				pink: {
    					DEFAULT: 'hsl(330 81% 60%)',
    					light: 'hsl(336 84% 73%)',
    					dark: 'hsl(330 80% 50%)'
    				},
    				lavender: {
    					DEFAULT: 'hsl(258 90% 66%)',
    					light: 'hsl(266 85% 80%)',
    					dark: 'hsl(258 80% 50%)'
    				},
    				yellow: {
    					DEFAULT: 'hsl(45 93% 47%)',
    					light: 'hsl(48 96% 53%)',
    					dark: 'hsl(45 80% 40%)'
    				},
    				indigo: {
    					DEFAULT: 'hsl(239 84% 67%)',
    					light: 'hsl(243 75% 79%)',
    					dark: 'hsl(239 80% 50%)'
    				},
    				gray: {
    					DEFAULT: 'hsl(215 16% 47%)',
    					light: 'hsl(218 11% 65%)',
    					dark: 'hsl(215 20% 35%)'
    				}
    			}
    		},
    		keyframes: {
    			'accordion-down': {
    				from: {
    					height: '0'
    				},
    				to: {
    					height: 'var(--radix-accordion-content-height)'
    				}
    			},
    			'accordion-up': {
    				from: {
    					height: 'var(--radix-accordion-content-height)'
    				},
    				to: {
    					height: '0'
    				}
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out'
    		},
    		boxShadow: {
    			'2xs': 'var(--shadow-2xs)',
    			xs: 'var(--shadow-xs)',
    			sm: 'var(--shadow-sm)',
    			md: 'var(--shadow-md)',
    			lg: 'var(--shadow-lg)',
    			xl: 'var(--shadow-xl)',
    			'2xl': 'var(--shadow-2xl)'
    		}
    	}
    },
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

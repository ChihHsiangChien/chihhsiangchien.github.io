// Define the base speed and distance
const baseSpeed = 100; // units/second
const distance = 250; // units
const RANDOM_ERROR_RANGE = 0.05; // 誤差範圍 ±5%

const variableDefinitions = {
    robot: {
        label: '主體',
        values: {
            A: {
                label: '主體A',
                cardSVG: `
                    <svg width="32" height="32">
                        <circle cx="16" cy="16" r="14" fill="#4a5568"/>
                        <text x="16" y="22" text-anchor="middle" font-size="18" fill="#fff">A</text>
                    </svg>
                `,
                robotSVG: `
                    <rect x="15" y="30" width="70" height="40" rx="10" ry="10" stroke="#4a5568" stroke-width="3" fill="#6b7280"/>
                    <circle cx="50" cy="25" r="10" fill="#4a5568"/>
                    <rect x="40" y="5" width="20" height="20" rx="5" ry="5" fill="#e2e8f0"/>
                `,                
                speed: 0
            },
            B: {
                label: '主體B',
                cardSVG: `
                    <svg width="32" height="32">
                        <circle cx="16" cy="16" r="14" fill="#4a5568"/>
                        <text x="16" y="22" text-anchor="middle" font-size="18" fill="#fff">B</text>
                    </svg>
                `,
                robotSVG: `
                    <rect x="15" y="30" width="70" height="40" rx="10" ry="10" stroke="#4a5568" stroke-width="3" fill="#6b7280"/>
                    <circle cx="50" cy="25" r="10" fill="#4a5568"/>
                    <rect x="40" y="5" width="20" height="20" rx="5" ry="5" fill="#e2e8f0"/>
                `,                
                speed: 0
            }
        }
    },
    tires: {
        label: '輪胎材質',
        values: {
            Rubber: {
                label: '橡膠輪胎',
                cardSVG: `
                    <svg width="32" height="32">
                        <circle cx="16" cy="16" r="12" fill="#4a5568" stroke="#cbd5e1" stroke-width="3"/>
                        </svg>
                `,
                robotSVG: `
                    <g transform="translate(0, 70)">
                        <circle cx="30" cy="0" r="15" fill="#4a5568" stroke="#cbd5e1" stroke-width="5"/>
                        <circle cx="70" cy="0" r="15" fill="#4a5568" stroke="#cbd5e1" stroke-width="5"/>
                    </g>
                `,
                speed: 0
            },
            Metal: {
                label: '金屬輪胎',
                cardSVG: `
                    <svg width="32" height="32">
                        <circle cx="16" cy="16" r="12" fill="#a0aec0" stroke="#4a5568" stroke-width="2"/>
                    </svg>
                `,
                robotSVG: `
                    <g transform="translate(0, 70)">
                        <circle cx="30" cy="0" r="15" fill="#a0aec0" stroke="#4a5568" stroke-width="2"/>
                        <circle cx="70" cy="0" r="15" fill="#a0aec0" stroke="#4a5568" stroke-width="2"/>
                    </g>
                `,
                speed: -10
            }
        }
    },

    power: {
        label: '電池品牌',
        values: {
            Lightspeed: {
                label: '光速電池',
                cardSVG: `
                    <svg width="32" height="32">
                        <rect x="10" y="8" width="12" height="16" rx="3" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                        <text x="16" y="20" text-anchor="middle" font-size="14" fill="#b45309">⚡</text>
                    </svg>
                    `,
                robotSVG: `
                    <g transform="translate(85, 50)">
                        <rect x="-10" y="-15" width="20" height="30" rx="4" ry="4" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                        <rect x="-4" y="-20" width="8" height="6" rx="2" ry="2" fill="#fde68a" stroke="#b45309" stroke-width="1"/>
                        <text x="0" y="5" text-anchor="middle" alignment-baseline="middle" font-size="12" font-weight="bold" fill="#b45309">⚡</text>
                    </g>
                `,
                speed: 20
            },
            Endurance: {
                label: '耐力電池',
                cardSVG: `
                    <svg width="32" height="32">
                        <rect x="10" y="8" width="12" height="16" rx="3" fill="#60a5fa" stroke="#1e40af" stroke-width="2"/>
                        <text x="16" y="20" text-anchor="middle" font-size="14" fill="#1e40af">🔋</text>
                    </svg>
                    `,
                robotSVG: `
                    <g transform="translate(85, 50)">
                        <rect x="-10" y="-15" width="20" height="30" rx="4" ry="4" fill="#60a5fa" stroke="#1e40af" stroke-width="2"/>
                        <rect x="-4" y="-20" width="8" height="6" rx="2" ry="2" fill="#dbeafe" stroke="#1e40af" stroke-width="1"/>
                        <text x="0" y="5" text-anchor="middle" alignment-baseline="middle" font-size="12" font-weight="bold" fill="#1e40af">🔋</text>
                    </g>
                `,
                speed: 10
            }
        }
    },
    conveyor: {
        label: '傳送帶',
        values: {
            blue: {
                label: '藍傳送帶',
                cardSVG: `
                    <svg width="32" height="32">
                        <rect x="4" y="14" width="24" height="4" fill="#60a5fa"/>
                    </svg>
                    `,
                robotSVG: `
                    <g transform="translate(10, 80)">
                        <rect x="0" y="0" width="80" height="12" rx="4" fill="#60a5fa" stroke="#2563eb" stroke-width="2"/>
                        <circle cx="12" cy="6" r="4" fill="#3b82f6"/>
                        <circle cx="40" cy="6" r="4" fill="#3b82f6"/>
                        <circle cx="68" cy="6" r="4" fill="#3b82f6"/>
                    </g>
                `,
                speed: 0
            },
            yellow: {
                label: '黃傳送帶',
                cardSVG: `
                    <svg width="32" height="32">
                        <rect x="4" y="14" width="24" height="4" fill="#fbbf24"/>
                    </svg>
                `,
                robotSVG: `
                    <g transform="translate(10, 80)">
                        <rect x="0" y="0" width="80" height="12" rx="4" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                        <circle cx="12" cy="6" r="4" fill="#f59e42"/>
                        <circle cx="40" cy="6" r="4" fill="#f59e42"/>
                        <circle cx="68" cy="6" r="4" fill="#f59e42"/>
                    </g>
                `,
                speed: 20
            }
        }
    }
};
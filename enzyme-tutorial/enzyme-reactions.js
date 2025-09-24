// enzyme-reactions.js
// 將所有反應規則集中於此，方便維護與擴充

export const reactions = [
  {
    type: 'decompositionA',
    enzymeActiveIcon: 'svg/enzyme_A_active.svg',
    enzymeDenaturedIcon: 'svg/enzyme_A_denatured.svg',
    substrates: ['A'],
    substrateIcons: ['svg/A.svg'],
    products: ['B', 'C'],
    productIcons: ['svg/B.svg', 'svg/C.svg'],
    denatureTemp: 50,
    sound: 'sounds/decom.mp3'

  },
  {
    type: 'synthesisE',
    enzymeActiveIcon: 'svg/enzyme_E_active.svg',
    enzymeDenaturedIcon: 'svg/enzyme_E_denatured.svg',
    substrates: ['C','D'],
    substrateIcons: ['svg/C.svg','svg/D.svg'],
    products: ['E'],
    productIcons: ['svg/E.svg'],
    denatureTemp: 70,
    sound: 'sounds/syn.mp3'
  } ,
  {
    type: 'decompositionA2',
    enzymeActiveIcon: 'svg/enzyme_A2_active.svg',
    enzymeDenaturedIcon: 'svg/enzyme_A2_denatured.svg',
    substrates: ['A'],
    substrateIcons: ['svg/A.svg'],
    products: ['F', 'G'],
    productIcons: ['svg/F.svg', 'svg/G.svg'],
    denatureTemp: 80,
    sound: 'sounds/decom.mp3'
  },
  {
    type: 'enzymeB_decompose_enzymeA',
    enzymeActiveIcon: 'svg/enzyme_B_active.svg',
    enzymeDenaturedIcon: 'svg/enzyme_B_denatured.svg',
    substrates: ['decompositionA'], // 這裡填酵素A的type
    substrateIcons: ['svg/enzyme_A_active.svg'],
    products: ['H', 'I'],
    productIcons: ['svg/H.svg', 'svg/I.svg'],
    denatureTemp: 40,
    sound: 'sounds/decom.mp3'
  },  
  // ...可擴充
];

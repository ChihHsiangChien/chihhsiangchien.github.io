// enzyme-reactions.js
// 將所有反應規則集中於此，方便維護與擴充

export const reactions = [
  {
    type: 'decompositionA',
    enzymeActiveIcon: 'enzyme_A_active.svg',
    enzymeDenaturedIcon: 'enzyme_A_denatured.svg',
    substrates: ['A'],
    substrateIcons: ['A.svg'],
    products: ['B', 'C'],
    productIcons: ['B.svg', 'C.svg'],
    denatureTemp: 40
  },
  {
    type: 'synthesisE',
    enzymeActiveIcon: 'enzyme_E_active.svg',
    enzymeDenaturedIcon: 'enzyme_E_denatured.svg',
    substrates: ['C','D'],
    substrateIcons: ['C.svg','D.svg'],
    products: ['E'],
    productIcons: ['E.svg'],
    denatureTemp: 70
  }  
  // ...可擴充
];

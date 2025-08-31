declare module 'spin-wheel' {
  export class Wheel {
    constructor(container: HTMLElement, props?: any);
    spin?(speed?: number): void;
    spinToItem?(index: number, duration?: number, clockwise?: boolean, spins?: number, overshoot?: number, easing?: any): void;
    setProps?(props: any): void;
    destroy?(): void;
  }
}

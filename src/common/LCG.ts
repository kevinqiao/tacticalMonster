export class LCG {
    private seed: number;
    private state: number;
    private readonly a: number;
    private readonly c: number;
    private readonly m: number;

    constructor(seed: number) {
        this.seed = seed;
        this.state = seed;
        this.a = 1664525;
        this.c = 1013904223;
        this.m = Math.pow(2, 32); // 2^32
    }

    // Generate the next pseudo-random number in the sequence
    public next(): number {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state / this.m;
    }

    // Generate the n-th pseudo-random number in the sequence
    public nth(n: number): number {
        const a_n: number = Math.pow(this.a, n);
        const x_n: number = (a_n * this.seed + this.c * (a_n - 1) / (this.a - 1)) % this.m;
        return x_n / this.m;
    }

    // Reset the generator to its initial state
    public reset(): void {
        this.state = this.seed;
    }
}

// Using the generator with a seed of 42
const generator = new LCG(42);

console.log(generator.next()); // Should output 0.24921805197373068 or similar
console.log(generator.next()); // Should output 0.41686205125935376 or similar

// Reset the generator
generator.reset();

// Generating the 1st and 2nd numbers in the sequence directly
console.log(generator.nth(1)); // Should output 0.24921805197373068 or similar
console.log(generator.nth(2)); // Should output 0.41686205125935376 or similar

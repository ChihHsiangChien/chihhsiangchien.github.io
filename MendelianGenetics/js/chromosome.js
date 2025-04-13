class Chromosome {
    constructor(number, alleles) {
        this.number = number;
        this.alleles = alleles;
    }

    static combine(chromosome1, chromosome2) {
        if (chromosome1.number !== chromosome2.number) {
            throw new Error('Cannot combine chromosomes with different numbers');
        }
        
        const combinedAlleles = [...chromosome1.alleles, ...chromosome2.alleles];
        return new Chromosome(chromosome1.number, combinedAlleles);
    }

    clone() {
        return new Chromosome(this.number, [...this.alleles]);
    }
}
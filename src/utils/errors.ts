export class ParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string | undefined,
    public readonly line: number,
  ) {
    super(filePath ? `${filePath}:${line}: ${message}` : `line ${line}: ${message}`);
    this.name = 'ParseError';
  }
}

export class EmitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmitError';
  }
}

export class CircularReferenceError extends Error {
  constructor(public readonly key: string, public readonly chain: string[]) {
    super(`Circular variable reference detected: ${chain.join(' -> ')} -> ${key}`);
    this.name = 'CircularReferenceError';
  }
}

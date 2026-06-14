export interface ContractFixture<T> {
  readonly name: string;
  readonly value: T;
}

export * from "./golden-fixtures.js";
export * from "./invariant-cases.js";

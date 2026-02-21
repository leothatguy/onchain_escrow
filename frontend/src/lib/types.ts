export interface PlutusScript {
  title: string;
  datum?: {
    schema: Record<string, any>;
  };
  redeemer?: {
    schema: Record<string, any>;
  };
  compiledCode: string;
  hash: string;
}

export interface PlutusDefinition {
  preamble: {
    title: string;
    description: string;
    version: string;
    plutusVersion: string;
    compiler: {
      name: string;
      version: string;
    };
    license: string;
  };
  validators: PlutusScript[];
  definitions: Record<string, any>;
}

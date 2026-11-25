export interface FarmPlotContractCheck {
  ok: boolean;
  plotCount: number;
  errors: string[];
}

export function validateFarmPlotContract(farmMap: unknown): FarmPlotContractCheck;
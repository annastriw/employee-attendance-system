import type { ComponentProps } from 'react';
import { MasterDataPage } from './MasterDataPage';
export function PositionsPage(props: Omit<ComponentProps<typeof MasterDataPage>, 'resource'>) {
  return <MasterDataPage {...props} resource="positions" />;
}

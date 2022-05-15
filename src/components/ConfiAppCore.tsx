import React from 'react';
import { StoreProvider } from 'easy-peasy';
import OtvApp from './ConfiApp';
import { otvAppStore } from '../core/confiAppStore';

function OtvAppCore() {
	return (
		<StoreProvider store={otvAppStore}>
			<OtvApp />
		</StoreProvider>
	)
}

export default OtvAppCore;

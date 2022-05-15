import React from 'react';
import AppLink from '../components/AppLink';

function NotFoundPage() {
	return <div className='SectionWrapper'>
		<div>
			<AppLink href="/">❮ Home</AppLink>
		</div>
		<div className='mt-1_5'>Not found</div>
	</div>
}

export default NotFoundPage;

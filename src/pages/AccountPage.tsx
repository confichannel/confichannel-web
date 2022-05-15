import React, {useState, useCallback} from 'react';

function AccountPage() {
	const [confirmation, setConfirmation] = useState<string>('');
	const didConfirm = confirmation === 'DELETE';

	const clearAllData = useCallback(() => {
		localStorage.clear();
		window.location.assign('/');
	}, []);
	
	return <>
		<form
			className='SectionWrapper'
			onSubmit={(event) => {
				event.preventDefault();
				if (!didConfirm) {
					return;
				}
				clearAllData();
			}}
		>
			<h2>Account</h2>
			<h3 className='mt-1'>Delete Account</h3>
			<p className='mt-1'>
				Delete all ConfiChannel data on this device. All your channels will be
				removed. This is not reversible.
			</p>
			<div className='mt-1'>
				<label htmlFor='confirmation'>Type "DELETE" to confirm</label>
			</div>
			<div className='mt-0_5'>
				<input
					className='TextInput'
					id='confirmation'
					value={confirmation}
					onChange={
					(event) => setConfirmation(event.target.value || '')
				} />
			</div>
			<div className='mt-0_5'>
				<button
					type='submit'
					className='button'
					disabled={!didConfirm}
				>Delete Account</button>
			</div>
		</form>
	</>
}

export default AccountPage;

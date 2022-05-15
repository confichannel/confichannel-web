import React, { useCallback, useRef, useState } from 'react';
import ReactDOM from 'react-dom'
import { apiRequest } from '../core/apiRequest';
import { useStoreActions, useStoreState } from '../core/confiAppStore';
import { Subscription } from '../types/Subscription';

const paypalClientId = process.env.NODE_ENV === 'production' ?
	process.env.REACT_APP_PAYPAL_CLIENT_ID_PRODUCTION :
	process.env.REACT_APP_PAYPAL_CLIENT_ID_SANDBOX;

if (!paypalClientId) {
	throw new Error('PayPal client id not configured');
}

export function PaypalButton(props: {
	title: string, 
	planId: string, 
	onLoadClick?: () => void
}) {
	const [paypalReady, setPaypalReady] = useState(false)
	const paypalLib = useRef()
	const { deviceToken } = useStoreState(state => state);
	const {
		saveActiveSubscriptionIdLocally,
		saveSubscriptionLocally,
		setShowSubscriptionThankyou,
	} = useStoreActions((actions) => actions);

	// Load PayPal function only loads PayPal once a person clicks on the purchase
	// subscription button.
	const loadPayPal = useCallback(() => {
		// Load JS by creating script tag
		if (paypalLib.current) {
			setPaypalReady(true)
			return
		}
		if ((window as any).paypal) {
			paypalLib.current = (window as any).paypal
			setPaypalReady(true)
			return
		}
		if (typeof props.onLoadClick === 'function') {
			props.onLoadClick();
		}

		const paypalScriptElm = document.createElement('script')
		paypalScriptElm.src = `https://www.paypal.com/sdk/js?client-id=${
			paypalClientId
		}&components=buttons&vault=true&intent=subscription&currency=EUR`;
		document.body.appendChild(paypalScriptElm);
		let checkPayPalLoadedId: any = setInterval(() => {
			if (!!(window as any).paypal?.Buttons?.driver) {
				clearInterval(checkPayPalLoadedId)
				checkPayPalLoadedId = null;
				paypalLib.current = (window as any).paypal;
				setPaypalReady(true);
			}
		}, 50)

		return () => {
			if (checkPayPalLoadedId) {
				clearInterval(checkPayPalLoadedId)
			}
		}
	}, [props])
	
	const PaymentButton = (paypalLib as any).current?.Buttons?.driver('react', {
		React, ReactDOM
	})

	return <>
		{!paypalReady && <button
			className='PurchaseButton'
			onClick={loadPayPal}
		>
			{props.title}
		</button>}
		{paypalReady && PaymentButton && <PaymentButton
			createSubscription={async (data: any, actions: any) => {
				try {
					const newSubscription = (await apiRequest('/subscriptions', {
						method: 'POST',
						body: {},
						deviceToken,
					})) as {
						id: string;
					}
					return actions.subscription.create({
						'plan_id': props.planId,
						'custom_id': newSubscription.id,
					})
				} catch (err: any) {
					alert(`An error occurred while trying to create a subscription: ${err.message}`)
					console.error(err);
				}
			}}
			onApprove={(data: any, actions: any) => {
				const subscription: Subscription = {
					id: data.subscriptionID,
					subscriptionName: props.title,
					storageKey: `subscription_paypal_${data.subscriptionID}`
				}
				saveSubscriptionLocally(subscription);
				saveActiveSubscriptionIdLocally(subscription.id);
				setShowSubscriptionThankyou(true);
			}}
			onCancel={(data: any) => {}}
			onError={(err: any) => {
				console.error(err)
			}}
			style={{
				label: 'paypal',
				size: 'responsive',
				shape: 'rect',
				color: 'gold',
				tagline: false
			}}
		/>}
	</>
}

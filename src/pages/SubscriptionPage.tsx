import React, { useState } from 'react';
import AppLink from '../components/AppLink';
import { useStoreActions, useStoreState } from '../core/confiAppStore';
import { PaypalButton } from '../components/PayPalButton';

const paypalMonthlyPlanId = process.env.REACT_APP_PAYPAL_MONTHLY_PLAN_ID || '';
const paypal6MonthPlanId = process.env.REACT_APP_PAYPAL_6MONTH_PLAN_ID || '';
const paypal12MonthPlanId = process.env.REACT_APP_PAYPAL_12MONTH_PLAN_ID || '';

if (!paypalMonthlyPlanId || !paypal6MonthPlanId || !paypal12MonthPlanId) {
	throw new Error(`Invalid PayPal plan ids`);
}

const yearlyText = 'Yearly: 8.00 EUR per year (save 33%)';
const sixMonthText = '6-Month: 4.80 EUR per (save 20%)';
const monthlyText = 'Monthly: 1.00 EUR per month';

function SubscriptionPage() {
	const {
		activeSubscriptionId,
		showSubscriptionThankyou,
	} = useStoreState(state => state);
	const {
		setShowSubscriptionThankyou,
	} = useStoreActions((actions) => actions);
	const [selectedPlan, setSelectedPlan] = useState({value: paypal12MonthPlanId});
	const [showSelectedOption, setShowSelectedOption] = useState(false);
	let selectedOptionText = yearlyText;
	if (selectedPlan.value) {
		switch (selectedPlan.value) {
			case paypalMonthlyPlanId:
				selectedOptionText = monthlyText;
				break;
			case paypal6MonthPlanId:
				selectedOptionText = sixMonthText;
				break;
			default:
				break;
		}
	}

	return <div id='purchaseSubscription' className='SectionWrapper'>
		{!!activeSubscriptionId && <>
			<h2>Your Subscription Info</h2>
			{showSubscriptionThankyou && <div className='SubscriptionThankyou'>
				<div>
					<p><strong>Thank you for purchasing a subscription!</strong></p>
					<p>ConfiChannel Plus has been activated on this device.</p>
					<p><button
						className='button'
						onClick={() => {
							setShowSubscriptionThankyou(false)
						}}
					>Close</button></p>
				</div>
			</div>}
			<p>You have a ConfiChannel Subscription.</p>
			<p>
				To cancel your subscription, log in to PayPal and go to Settings &gt;
				Payments &gt; Manage Pre-approved Payments then click Cancel or Cancel
				automatic billing.</p>
			<p>
				To request a refund, email <a
					href='mailto:refunds@confichannel.com'>refunds@confichannel.com
				</a>.</p>
			<p><AppLink href="/">Go To Channels</AppLink></p>
		</>}
		{!activeSubscriptionId && <>
			<h2>Upgrade to ConfiChannel Plus</h2>
			<p className='mt-1'>
				Purchase a <b>ConfiChannel Plus </b> subscription to get more out of
				ConfiChannel. Encrypt and send more passwords, personal data, credit car
				information, configuration settings, and other data!
			</p>
			<ul className='PricingFeaturesList mt-1'>
				<li>✅ Send messages of up to 1,000,000 characters</li>
				<li>✅ Create up to 1,000 channels</li>
			</ul>
			<p className='mt-1'>
				<em>
					Subscriptions are sold per device. You can get your money back
              within 30 days of purchasing your subscription. Email{' '}
					<a href="mailto:refunds@confichannel.com?subject=Refund%20Request">
						refunds@confichannel.com
              </a>.</em>
			</p>
			{!showSelectedOption && <div className='mt-2 text-align-center'>
				<select
					className='PaymentOptions'
					value={selectedPlan.value}
					onChange={(event) => setSelectedPlan({value: event.target.value})}
				>
					<option value={paypal12MonthPlanId}>{yearlyText}</option>
					<option value={paypal6MonthPlanId}>{sixMonthText}</option>
					<option value={paypalMonthlyPlanId}>{monthlyText}</option>
				</select>
			</div>}
			{showSelectedOption && <div className='mt-2 text-align-center'>
				<div className='SelectedPaymentOption'>
					Selected: <b>{selectedOptionText}</b>
				</div>
			</div>}
			<div className='mt-1 text-align-center'>
				<PaypalButton
					title='Pay with PayPal'
					planId={selectedPlan.value}
					onLoadClick={() => {
						setShowSelectedOption(true)
					}}
				/>
			</div>
		</>}
	</div>
}

export default SubscriptionPage;

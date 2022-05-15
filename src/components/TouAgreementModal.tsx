import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import AppLink from "./AppLink";
import { useStoreActions } from "../core/confiAppStore";
import { touAgreementStorageKey } from "../config";

function TouAgreementModal(props: {
	onDisagree: () => void
	onAgree?: () => void
	title?: string
}) {
	const { setTouAgreement } = useStoreActions(actions => actions);
	const agreeButtonRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		agreeButtonRef.current?.focus();
	}, [])

	return ReactDOM.createPortal(
		<div className='BodyShadowOverlay'>
			<form
				onSubmit={(event) => {
					event.preventDefault()
					localStorage.setItem(touAgreementStorageKey, JSON.stringify(true));
					setTouAgreement(true);
					if (typeof props.onAgree === 'function') {
						props.onAgree()
					}
				}}
				className='TermsOfUseAgreementContainer'
			>
				<h1 className='TermsOfUseAgreementHeader'>{
					props.title ? props.title : 'Your permission required to start sending encrypted messages'
				}</h1>
				<div>By clicking Use ConfiChannel, you agree to our <AppLink
					href='/terms-of-use'>Terms of Use</AppLink> and <AppLink
					href='/privacy-policy'>Privacy Policy</AppLink>. We store some data on
					your device which is required for ConfiChannel to function.</div>
				<div className='mt-1_5 text-align-center'>
					<button
						className='button'
						type="submit"
						ref={agreeButtonRef}
					>Use ConfiChannel</button>
				</div>
				<div className='mt-0_667 text-align-center'>
					<button
						className='linkbutton'
						onClick={(event) => {
							event.preventDefault()
							event.stopPropagation();
							props.onDisagree()
						}}
					>
						I don't agree
					</button>
				</div>
			</form>
		</div>,
		document.body
	)
}

export default TouAgreementModal;

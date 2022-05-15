import React, { ReactElement, useState } from "react";

function InfoText(props: {
	children: ReactElement | string
}) {
	const { children } = props;
	const [isShowing, setIsShowing] = useState(false);
	return <>
		{isShowing
			? <span>
					{children}{' '}
					<button
						className="linkbutton"
						onClick={() => setIsShowing(false)}
					>Close</button>
				</span>
			: <span>
					<button
						className="linkbutton"
						onClick={() => setIsShowing(true)}
					>ℹ</button>
				</span>
		}
	</>
}

export default InfoText;

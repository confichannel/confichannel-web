import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import logo from '../images/logo.svg';
import '../styles/App.css';
import { activeSubscriptionIdStorageKey, deviceIdStorageKey, touAgreementStorageKey } from '../config';
import { Channel } from '../types/Channel';
import { AppMessageType } from '../types/AppMessage';
import { useStoreActions, useStoreState } from '../core/confiAppStore';
import { createBrowserHistory, Location } from "history";
import Footer from './Footer';
import AppLink from './AppLink';
import AboutPage from '../pages/AboutPage';
import AccountPage from '../pages/AccountPage';
import SecurityInformation from '../pages/SecurityInformation';
import { extractChannelIdFromPath } from '../helpers/extractChannelIdFromPath';
import SubscriptionPage from '../pages/SubscriptionPage';
import ImpressumPage from '../pages/ImpressumPage';
import TermsOfUsePage from '../pages/TermsOfUsePage';
import PrivacyNoticePage from '../pages/PrivacyPolicyPage';
import NewChannelPage, { ChannelType } from '../pages/NewChannelPage';
import ChannelPage from '../pages/ChannelPage';
import ChannelsPage from '../pages/ChannelsPage';
import NotFoundPage from '../pages/NotFoundPage';
import AcceptInvitationPage from '../pages/AcceptInvitationPage';
import { apiRequest } from '../core/apiRequest';
import ChangelogPage from '../pages/ChangelogPage';
import TouAgreementPage from '../pages/TouAgreementPage';
import { InviteInfo } from '../types/InviteInfo';

const browserHistory = createBrowserHistory();

export const NavigationContext = React.createContext(browserHistory);

type DeviceTokenResponsePayload = {
  deviceToken: string;
}

function getPageFromPath(
  pathname: string,
  inviteInfo: InviteInfo | null,
  touAgreement: boolean | undefined,
  channelsMap: {
    [key: string]: Channel;
  }
): {
  PageComponent: () => JSX.Element
  pageComponentName: string
} {
  if (pathname.startsWith('/about')) {
    return {
      PageComponent: AboutPage,
      pageComponentName: 'AboutPage',
    }
  } else if (pathname.startsWith('/security')) {
    return {
      PageComponent: SecurityInformation,
      pageComponentName: 'SecurityInformation',
    }
  } else if (pathname.startsWith('/impressum')) {
    return {
      PageComponent: ImpressumPage,
      pageComponentName: 'ImpressumPage',
    }
  } else if (pathname.startsWith('/terms-of-use')) {
    return {
      PageComponent: TermsOfUsePage,
      pageComponentName: 'TermsOfUsePage',
    }
  } else if (pathname.startsWith('/privacy-policy')) {
    return {
      PageComponent: PrivacyNoticePage,
      pageComponentName: 'PrivacyNoticePage',
    }
  } else if (pathname.startsWith('/changelog')) {
    return {
      PageComponent: ChangelogPage,
      pageComponentName: 'ChangelogPage',
    }
  } else if (pathname.startsWith('/i/') || inviteInfo) {
    // Invite page is a functional page without touAgreement because it handles
    // getting touAgreement as part of invite acceptance.
    return {
      PageComponent: AcceptInvitationPage,
      pageComponentName: 'AcceptInvitationPage',
    }
  } else if (!touAgreement) {
    // Only allow access to functional pages if touAgreement is in place
    if (!pathname || pathname === '/') {
      return {
        PageComponent: TouAgreementPage,
        pageComponentName: 'TouAgreementPage',
      }
    } else {
      return {
        PageComponent: NotFoundPage,
        pageComponentName: 'NotFoundPage',
      }
    }
  } else if (pathname.startsWith('/channels/')) {
    const channelId = extractChannelIdFromPath(pathname)
    if (channelId && channelsMap[channelId]) {
      return {
        PageComponent: ChannelPage,
        pageComponentName: 'ChannelPage',
      }
    } else {
      return {
        PageComponent: NotFoundPage,
        pageComponentName: 'NotFoundPage',
      }
    }
  } else if (pathname.startsWith('/purchase-subscription')) {
    return {
      PageComponent: SubscriptionPage,
      pageComponentName: 'SubscriptionPage',
    }
  } else if (pathname.startsWith('/new-channel')) {
    return {
      PageComponent: NewChannelPage,
      pageComponentName: 'NewChannelPage',
    }
  } else if (pathname.startsWith('/account')) {
    return {
      PageComponent: AccountPage,
      pageComponentName: 'AccountPage',
    }
  } else if (
    !Object.keys(channelsMap).length &&
    (
      !pathname ||
      pathname === '/'
    )
  ) {
    return {
      PageComponent: NewChannelPage,
      pageComponentName: 'NewChannelPage',
    }
  } else {
    return {
      PageComponent: ChannelsPage,
      pageComponentName: 'ChannelsPage',
    }
  }
}

function OtvApp() {
  const {
    channels,
    channelsMap,
    inviteInfo,
    deviceToken,
    activeSubscriptionId,
    touAgreement,
  } = useStoreState(state => state);
  const {
    addChannel,
    setDeviceToken,
    setActiveSubscriptionId,
    saveActiveSubscriptionIdLocally,
    setTouAgreement,
  } = useStoreActions((actions) => actions);
  const [location, setLocation] = useState<Location | null>(null);
  const history = useContext(NavigationContext);
  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const subscriptionTimeoutRef = useRef<null | number>(null);
  const lastTouAgreementValue = useRef<boolean | undefined>(false);
  const isGettingDeviceIdRef = useRef<boolean>(false);

  useEffect(() => {
    setLocation(history.location);
    const unlisten = history.listen(locationUpdate => {
      setLocation(locationUpdate.location);
    });
    return unlisten;
  }, [history]);

  const checkForNewToken = useCallback((res: Response) => {
    const newToken = res.headers.get('x-confi-token');
    if (newToken) {
      window.localStorage.setItem(deviceIdStorageKey, newToken);
      setDeviceToken(newToken);
    }
  }, [setDeviceToken]);

  const loadDeviceToken = useCallback(() => {
    async function doLoadDeviceToken() {
      try {
        if (isGettingDeviceIdRef.current) {
          return;
        }
        isGettingDeviceIdRef.current = true;
        const deviceToken = window.localStorage.getItem(deviceIdStorageKey);
        if (!deviceToken) {
          const payload = (await apiRequest('/devices', {
            method: 'POST',
          })) as DeviceTokenResponsePayload;
          const { deviceToken: newDeviceToken } = payload;
          if (!newDeviceToken) {
            throw new Error(`Invalid device auth response`);
          }
          window.localStorage.setItem(deviceIdStorageKey, newDeviceToken);
          setDeviceToken(newDeviceToken);
          setIsLoaded(true);
        } else {
          // Check validity of token
          try {
            await apiRequest('/devices/status', {
              checkForNewToken,
              deviceToken,
            });
            setDeviceToken(deviceToken);
            setIsLoaded(true);
          } catch (err: any) {
            if (err.status === 401) {
              // This device is no longer authorized (probably the JWT token
              // reached its expiration date). Therefore, clear data, and start
              // from scratch
              localStorage.clear();
              window.location.reload();
            } else {
              setConnectionError('Could not connect to server.');
              throw new Error(`An error was encountered when checking device status`);
            }
          }
        }
      } catch (err) {
        setConnectionError('Could not connect to server.');
        console.error(err);
        // TODO: ask user to refresh page - no device.
      }
    }
    doLoadDeviceToken();
  }, [checkForNewToken, setDeviceToken]);

  useEffect(() => {
    async function checkTouAgreement() {
      if (touAgreement && touAgreement !== lastTouAgreementValue.current) {
        lastTouAgreementValue.current = touAgreement;
        setIsLoaded(false);
        loadDeviceToken();
        return;
      }
      const touAgreementRaw = localStorage.getItem(touAgreementStorageKey);
      if (!touAgreementRaw) {
        setTouAgreement(undefined);
        lastTouAgreementValue.current = undefined;
        setIsLoaded(true);
        return;
      }
      const touAgreementFromStorage = JSON.parse(touAgreementRaw);
      if (typeof touAgreementFromStorage !== 'boolean') {
        setTouAgreement(undefined);
        lastTouAgreementValue.current = undefined;
        setIsLoaded(true);
        return;
      }
      if (!touAgreementFromStorage) {
        setTouAgreement(false);
        lastTouAgreementValue.current = false;
        setIsLoaded(true);
        return;
      }
      setTouAgreement(true);
      loadDeviceToken();
    }
    checkTouAgreement();
  }, [loadDeviceToken, setTouAgreement, touAgreement]);

  useEffect(() => {
    async function checkForActiveSubscriptionId() {
      try {
        const activeSubscriptionId = window.localStorage.getItem(activeSubscriptionIdStorageKey);
        if (activeSubscriptionId) {
          setActiveSubscriptionId(activeSubscriptionId);
        }
      } catch (err: any) {
        console.error(err)
      }
    }
    checkForActiveSubscriptionId();
  }, [setActiveSubscriptionId])

  useEffect(() => {
    // Do migrations
    const confiChannelVersion = localStorage.getItem('confiChannelVersion');
    if (!confiChannelVersion) {
      const storedChannelKeys = Object.keys(window.localStorage)
        .filter(key => key.startsWith('channel_'));
      for (const storedChannelKey of storedChannelKeys) {
        const channelData = JSON.parse(window.localStorage[storedChannelKey]) as Channel
        if (!channelData.channelType) {
          window.localStorage.setItem(storedChannelKey, JSON.stringify(
            Object.assign({}, channelData, {
              channelType: 'bidirectional' as ChannelType,
            })
          ))
        }
      }
    }
    // if (channelVersion < versionWhichMigratesData) {
    // do migration for given version
    // }

    // Actually move the channels into the app
    const storedChannelKeys = Object.keys(window.localStorage)
      .filter(key => key.startsWith('channel_'));
    storedChannelKeys.forEach(async function (channelStorageKey) {
      try {
        const channelRaw = localStorage.getItem(channelStorageKey)
        if (!channelRaw) {
          console.warn(`Channel ${channelStorageKey} was not found`)
          return;
        }
        const channel: Channel = JSON.parse(channelRaw) as Channel;
        addChannel(channel);
      } catch (err: any) {
        console.error(err);
      }
    });
  }, [addChannel]);

  useEffect(() => {
    let isLoaded = true;
    async function checkSubscriptionIsValid() {
      if (!isLoaded || !activeSubscriptionId || subscriptionTimeoutRef.current) {
        return;
      }
      try {
        const response = (
          await apiRequest(`/subscriptions/active`, {
            deviceToken,
            checkForNewToken
          })
        ) as {
          activeSubscriptionId?: string;
          timeRemaining?: number;
        };
        const {
          activeSubscriptionId: newActiveSubscriptionId,
          timeRemaining,
        } = response;
        if (isLoaded) {
          if (newActiveSubscriptionId && timeRemaining) {
            if (newActiveSubscriptionId !== activeSubscriptionId) {
              saveActiveSubscriptionIdLocally(newActiveSubscriptionId);
            }
            subscriptionTimeoutRef.current = window.setTimeout(
              checkSubscriptionIsValid,
              (timeRemaining * 1000)
            )
          }
          else {
            saveActiveSubscriptionIdLocally('');
          }
        }
      } catch (err: any) {
        console.error(err);
      }
    }
    checkSubscriptionIsValid();
    return () => {
      isLoaded = false;
      if (subscriptionTimeoutRef.current) {
        window.clearTimeout(subscriptionTimeoutRef.current);
      }
    }
  }, [activeSubscriptionId, checkForNewToken, deviceToken, saveActiveSubscriptionIdLocally, setActiveSubscriptionId]);

  const { PageComponent, pageComponentName } = getPageFromPath(
    location?.pathname || '',
    inviteInfo,
    touAgreement,
    channelsMap,
  );

  const showAllChannelsLink = !!channels.length && (pageComponentName !== 'ChannelsPage');

  const historyState = (history.location?.state as any);
  const isChannelDeleted = !!(historyState && historyState.isChannelDeleted);

  return (
    <div className="App">
      <header className="AppHeader">
        <div className="AppHeaderTopBar">
          <AppLink className='LogoLink' href="/">
            <div className="AppLogoWrapper">
              <img src={logo} className="AppLogo" alt="logo" />
            </div>
            <div className="AppTitleWrapper">
              <h1>ConfiChannel</h1>
              <div className="AppTitleSubtitle">
                <em>Convenient confidental messaging</em>
              </div>
            </div>
          </AppLink>
          {touAgreement && !!channels.length && !activeSubscriptionId && <div>
            <AppLink
              href='/purchase-subscription'
              className='button HeaderUpgradeButton'
            >
              Upgrade
            </AppLink>
          </div>}
        </div>
        {showAllChannelsLink && <div className="AllChannelsLinkWrapper">
          <AppLink href="/">❮ All Channels
          </AppLink></div>}
      </header>
      <main className='AppMainContent'>
        <div className='AppPageWrapper'>
          {isChannelDeleted && <div className='AppMessageWrapper'><div className={
            `AppMessage ${AppMessageType[AppMessageType.Success]
            } mt-0_5 mb-0_5`}>
            Channel deleted.
          </div></div>}
          {!isLoaded && !connectionError && <div className='SectionWrapper'>Loading...</div>}
          {!isLoaded && connectionError && <div className='SectionWrapper'>
            <div className={
              `AppMessage ${AppMessageType[AppMessageType.Error]
              } mt-0_5 mb-0_5`}>
              Could not connect to server.
            </div>
          </div>}
          {!!isLoaded && PageComponent && <PageComponent />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default OtvApp;

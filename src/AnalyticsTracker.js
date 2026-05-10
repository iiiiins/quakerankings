import ReactGA from "react-ga4";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/*ReactGA.initialize("G-X11M9568HY");*/

const AnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ 
      hitType: "pageview",
      page: location.pathname,
      title: location.pathname
     });
  }, [location]);
  // Send pageview with a custom path
  //ReactGA.send({ hitType: "pageview", page: "/quakerankings", title: "react send qr" });
  //console.log("react send qr");

  return null; // This component doesn't render anything
};

export default AnalyticsTracker;

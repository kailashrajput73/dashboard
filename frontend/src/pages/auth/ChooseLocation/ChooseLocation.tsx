import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'styled-components';
import { TileLayer } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AppRoutes } from '../../../routes/appRoutes';
import type { SignupFlowArgs } from '../../../routes/appRoutes';
import { CircularProgress } from '../../../shared/CircularProgress';
import { LoginFlowContinueButton } from '../../../shared/LoginFlowContinueButton';
import chooseLocationMock from './ChooseLocation.mock.json';
import {
  Screen,
  Body,
  MapArea,
  MapSurface,
  TopBar,
  RoundIconButton,
  PinCenter,
  PinBounce,
  PinHalo,
  PinHead,
  PinShadow,
  LocateMeButton,
  Sheet,
  Title,
  Subtitle,
  SearchField,
  SearchHint,
  AddressCard,
  Switched,
  LocatedRow,
  CtaButton,
  IconBox,
  TextColumn,
  CurrentLocationLabel,
  Line1,
  Line2,
  ContinueWrap,
  LOCATE_SPINNER_SIZE,
  LOCATE_SPINNER_STROKE,
  CTA_SPINNER_SIZE,
  CTA_SPINNER_STROKE,
} from './ChooseLocation.styles';

const { _mockPlace: mockPlace, _defaultCenter: defaultCenter } = chooseLocationMock;
const center: [number, number] = [defaultCenter.latitude, defaultCenter.longitude];

/** AppRouter fallback when no SignupFlowArgs are passed. */
const fallbackArgs: SignupFlowArgs = { mobileNumber: '', fullName: '' };

/**
 * Step between signup and profession selection — lets the user drop a pin
 * on a (mocked) map or use their current location.
 */
export function ChooseLocation() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const args = (location.state as SignupFlowArgs | null) ?? fallbackArgs;
  const isLocationUpdate = args.isLocationUpdate ?? false;

  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const locatingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleUseCurrentLocation = async () => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    setLocated(false);

    await new Promise((resolve) => setTimeout(resolve, chooseLocationMock.locateDelayMs));
    locatingRef.current = false;
    if (!mountedRef.current) return;

    // _mapController.move(_defaultCenter, 16)
    mapRef.current?.setView(center, chooseLocationMock.locatedZoom, { animate: false });
    setLocating(false);
    setLocated(true);
  };

  const handleContinue = () => {
    if (isLocationUpdate) {
      navigate(-1);
      return;
    }
    navigate(AppRoutes.chooseProfession, { state: args });
  };

  return (
    <Screen>
      <Body>
        {/* Top half: real map surface. */}
        <MapArea>
          <MapSurface
            ref={mapRef}
            center={center}
            zoom={chooseLocationMock.initialZoom}
            zoomControl={false}
          >
            <TileLayer
              url={chooseLocationMock.tileLayer.urlTemplate}
              attribution={chooseLocationMock.tileLayer.attribution}
            />
          </MapSurface>

          {/* Back button, same style used across the auth flow. */}
          <TopBar>
            <RoundIconButton type="button" aria-label="Back" onClick={() => navigate(-1)}>
              <i className="pi pi-arrow-left" />
            </RoundIconButton>
          </TopBar>

          {/* Centered pin, fixed over the map (map pans beneath it). */}
          <PinCenter>
            <PinBounce $locating={locating}>
              <PinHalo>
                <PinHead>
                  <i className="pi pi-home" />
                </PinHead>
              </PinHalo>
            </PinBounce>
            <PinShadow />
          </PinCenter>

          {/* Locate-me FAB. */}
          <LocateMeButton
            type="button"
            aria-label="Use my current location"
            onClick={handleUseCurrentLocation}
          >
            {locating ? (
              <CircularProgress
                size={LOCATE_SPINNER_SIZE}
                strokeWidth={LOCATE_SPINNER_STROKE}
                color={theme.loginFlow.accent}
              />
            ) : (
              <i className="pi pi-bullseye" />
            )}
          </LocateMeButton>
        </MapArea>

        {/* Bottom half: search + location name + confirm button. */}
        <Sheet>
          <Title>Pin your location</Title>
          <Subtitle>
            Drag the map or search to place the pin exactly where you'd like deliveries and site
            visits.
          </Subtitle>
          <SearchField>
            <i className="pi pi-search" />
            <SearchHint>Search area, street or landmark</SearchHint>
          </SearchField>
          <AddressCard>
            {located ? (
              <Switched key="located">
                <LocatedRow>
                  <IconBox $iconSize="located">
                    <i className="pi pi-map-marker" />
                  </IconBox>
                  <TextColumn>
                    <CurrentLocationLabel>
                      Current location
                      <i className="pi pi-check-circle" />
                    </CurrentLocationLabel>
                    <Line1 $gapTop>{mockPlace.line1}</Line1>
                    <Line2>{mockPlace.line2}</Line2>
                  </TextColumn>
                </LocatedRow>
              </Switched>
            ) : (
              <Switched key="cta">
                <CtaButton type="button" onClick={handleUseCurrentLocation}>
                  <IconBox $iconSize="cta">
                    {locating ? (
                      <CircularProgress
                        size={CTA_SPINNER_SIZE}
                        strokeWidth={CTA_SPINNER_STROKE}
                        color={theme.loginFlow.accent}
                      />
                    ) : (
                      <i className="pi pi-bullseye" />
                    )}
                  </IconBox>
                  <TextColumn>
                    <Line1>{locating ? 'Finding your location…' : 'Use my current location'}</Line1>
                    <Line2>Or drag the pin to fine-tune it manually</Line2>
                  </TextColumn>
                </CtaButton>
              </Switched>
            )}
            <ContinueWrap>
              <LoginFlowContinueButton
                label="Confirm & continue"
                enabled={located}
                onPressed={handleContinue}
              />
            </ContinueWrap>
          </AddressCard>
        </Sheet>
      </Body>
    </Screen>
  );
}

// Step-based 5G SA signalling scenarios for the simulation engine.
//
// A scenario is a topology plus an ordered list of steps. Each step has an
// explicit { from, to } (node ids in the topology) and a message label, so the
// playback engine animates the correct direction — including request/response
// round-trips that the older sequence-number flows couldn't represent.

import { build5gsaFlowTopology } from './topology';

export const scenarios = [
  {
    key: 'registration',
    name: 'UE Registration',
    build: build5gsaFlowTopology,
    steps: [
      { from: 'ue', to: 'gnb', message: 'RRC Setup + Registration Request' },
      { from: 'gnb', to: 'amf', message: 'N2: Registration Request (NAS)' },
      { from: 'amf', to: 'ausf', message: 'N12: Nausf authentication request' },
      { from: 'ausf', to: 'udm', message: 'N13: Nudm get auth vector' },
      { from: 'udm', to: 'ausf', message: 'N13: Authentication vector' },
      { from: 'ausf', to: 'amf', message: 'N12: Auth challenge / result' },
      { from: 'amf', to: 'udm', message: 'N8: Nudm subscriber data' },
      { from: 'udm', to: 'amf', message: 'N8: Subscription data' },
      { from: 'amf', to: 'pcf', message: 'N15: AM Policy Association' },
      { from: 'pcf', to: 'amf', message: 'N15: AM policy rules' },
      { from: 'amf', to: 'gnb', message: 'N2: Initial Context Setup' },
      { from: 'gnb', to: 'ue', message: 'RRC Reconfiguration + Registration Accept' },
    ],
  },
  {
    key: 'pdu-session',
    name: 'PDU Session Establishment',
    build: build5gsaFlowTopology,
    steps: [
      { from: 'ue', to: 'gnb', message: 'PDU Session Establishment Request' },
      { from: 'gnb', to: 'amf', message: 'N2: NAS PDU Session Request' },
      { from: 'amf', to: 'smf', message: 'N11: Nsmf CreateSMContext' },
      { from: 'smf', to: 'udm', message: 'N10: SM subscription fetch' },
      { from: 'udm', to: 'smf', message: 'N10: SM subscription data' },
      { from: 'smf', to: 'pcf', message: 'N7: SM Policy Association' },
      { from: 'pcf', to: 'smf', message: 'N7: PCC rules' },
      { from: 'smf', to: 'chf', message: 'N40: Nchf charging create' },
      { from: 'chf', to: 'smf', message: 'N40: Charging granted' },
      { from: 'smf', to: 'upf', message: 'N4: Session Establishment Request' },
      { from: 'upf', to: 'smf', message: 'N4: Session Establishment Response' },
      { from: 'smf', to: 'amf', message: 'N11: PDU Session response' },
      { from: 'amf', to: 'gnb', message: 'N2: PDU Session Resource Setup' },
      { from: 'gnb', to: 'ue', message: 'RRC Reconfiguration (PDU session)' },
    ],
  },
  {
    key: 'user-plane',
    name: 'User-Plane Data Path',
    build: build5gsaFlowTopology,
    steps: [
      { from: 'ue', to: 'gnb', message: 'Uplink data (PDU)' },
      { from: 'gnb', to: 'upf', message: 'N3: GTP-U uplink' },
      { from: 'upf', to: 'internet', message: 'N6: to data network' },
      { from: 'internet', to: 'upf', message: 'N6: downlink data' },
      { from: 'upf', to: 'gnb', message: 'N3: GTP-U downlink' },
      { from: 'gnb', to: 'ue', message: 'Downlink data (PDU)' },
    ],
  },
];

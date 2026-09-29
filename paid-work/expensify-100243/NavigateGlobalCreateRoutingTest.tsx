/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- use a minimal account fixture, matching NavigateGlobalCreateProviderTest */
import {act, render} from '@testing-library/react-native';
import {NavigateGlobalCreateProvider, useNavigateGlobalCreate} from '@pages/iou/request/step/IOURequestStepScan/components/NavigateGlobalCreateContext';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import React, {useEffect} from 'react';
import type {ComponentProps} from 'react';
import waitForBatchedUpdates from '../utils/waitForBatchedUpdates';

type Props = Omit<ComponentProps<typeof NavigateGlobalCreateProvider>, 'children'>;
type Dispatch = ReturnType<typeof useNavigateGlobalCreate>;

const mockSelfReport = {reportID: '100', chatType: CONST.REPORT.CHAT_TYPE.SELF_DM};
const mockWorkReport = {reportID: '200', chatType: CONST.REPORT.CHAT_TYPE.POLICY_EXPENSE_CHAT};
const mockState = {policyAuto: false, personalAuto: false, eligible: false};
const mockNavigate = jest.fn();
const mockPicker = jest.fn();
const mockConfirmation = jest.fn();
const mockSetReport = jest.fn();
const mockParticipants = jest.fn();
const mockPreserveParticipants = jest.fn();
const mockPolicyChat = jest.fn();
const mockGate = jest.fn();
const mockDeferred: Array<() => void> = [];

jest.mock('@hooks/useDefaultExpensePolicy', () => ({__esModule: true, default: () => ({id: 'p1', autoReporting: mockState.policyAuto})}));
jest.mock('@hooks/usePersonalPolicy', () => ({__esModule: true, default: () => ({autoReporting: mockState.personalAuto})}));
jest.mock('@hooks/useSelfDMReport', () => ({__esModule: true, default: () => mockSelfReport}));
jest.mock('@hooks/useOnyx', () => ({__esModule: true, default: () => [undefined]}));
jest.mock('@libs/IOUUtils', () => ({
    navigateToConfirmationPage: (...args: unknown[]) => mockConfirmation(...args),
    navigateToParticipantPage: (...args: unknown[]) => mockPicker(...args),
}));
jest.mock('@libs/Navigation/deferNavigate', () => ({__esModule: true, default: (callback: () => void) => mockDeferred.push(callback)}));
jest.mock('@libs/Navigation/Navigation', () => ({__esModule: true, default: {navigate: (...args: unknown[]) => mockNavigate(...args)}}));
jest.mock('@libs/ReportUtils', () => ({
    getPolicyExpenseChat: (...args: unknown[]) => {mockPolicyChat(...args); return mockWorkReport;},
    isSelfDM: (report: {reportID?: string} | undefined) => report?.reportID === mockSelfReport.reportID,
}));
jest.mock('@libs/shouldUseDefaultExpensePolicy', () => ({__esModule: true, default: (...args: unknown[]) => mockGate(...args)}));
jest.mock('@libs/telemetry/activeSpans', () => ({endSpan: jest.fn()}));
jest.mock('@pages/iou/request/step/IOURequestStepScan/utils/endScanProcessAndStartConfirmationMountSpan', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@pages/iou/request/step/IOURequestStepScan/utils/startScanProcessSpan', () => ({__esModule: true, default: jest.fn()}));
jest.mock('@userActions/IOU/MoneyRequest', () => ({
    setMoneyRequestParticipants: (...args: unknown[]) => mockPreserveParticipants(...args),
    setMoneyRequestParticipantsFromReport: (...args: unknown[]) => mockParticipants(...args),
}));
jest.mock('@userActions/Transaction', () => ({setTransactionReport: (...args: unknown[]) => mockSetReport(...args)}));

const baseProps = {
    iouType: CONST.IOU.TYPE.TRACK,
    reportID: '10',
    transactionID: '1',
    transaction: undefined,
    backToReport: undefined,
    currentUserPersonalDetails: {accountID: 42, login: 'contributor@example.com'},
} as unknown as Props;

async function mount(initial: Partial<Props> = {}) {
    let dispatch: Dispatch | undefined;
    const onMount = jest.fn();
    function Consumer() {
        const navigate = useNavigateGlobalCreate();
        useEffect(() => {dispatch = navigate;}, [navigate]);
        useEffect(() => {onMount();}, []);
        return null;
    }
    const createView = (props: Partial<Props>) => (
        <NavigateGlobalCreateProvider {...baseProps} {...props}>
            <Consumer />
        </NavigateGlobalCreateProvider>
    );
    const view = render(createView(initial));
    await waitForBatchedUpdates();
    await waitForBatchedUpdates();
    return {
        onMount,
        getDispatch() {
            if (!dispatch) {throw new Error('The real provider did not publish a dispatch function');}
            return dispatch;
        },
        invoke(ids = ['1'], multi = false) {
            if (!dispatch) {throw new Error('The real provider did not publish a dispatch function');}
            act(() => {dispatch?.(ids, multi);});
        },
        flushNavigation() {
            act(() => {while (mockDeferred.length) {mockDeferred.shift()?.();}});
        },
        async rerender(next: Partial<Props>) {
            view.rerender(createView({...initial, ...next}));
            await waitForBatchedUpdates();
            await waitForBatchedUpdates();
        },
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockDeferred.length = 0;
    mockState.policyAuto = false;
    mockState.personalAuto = false;
    mockState.eligible = false;
    mockGate.mockImplementation(() => mockState.eligible);
});

const trackingCases = [false, true].flatMap((policyAuto) =>
    [false, true].flatMap((personalAuto) => [false, true].map((multi) => ({policyAuto, personalAuto, multi}))),
);

describe('global scan destination through the mounted provider', () => {
    it.each(trackingCases)('TRACK stays personal: policy=$policyAuto, personal=$personalAuto, multi=$multi', async ({policyAuto, personalAuto, multi}) => {
        Object.assign(mockState, {policyAuto, personalAuto});
        const harness = await mount();
        const ids = multi ? ['1', '2', '3'] : ['1'];
        harness.invoke(ids, multi);
        expect(mockPicker).not.toHaveBeenCalled();
        expect(mockGate).not.toHaveBeenCalled();
        expect(mockPolicyChat).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockSetReport).toHaveBeenCalledTimes(ids.length);
        for (const id of ids) {
            expect(mockSetReport).toHaveBeenCalledWith(id, {reportID: CONST.REPORT.UNREPORTED_REPORT_ID}, true);
            expect(mockParticipants).toHaveBeenCalledWith(id, mockSelfReport, 42);
        }
        harness.flushNavigation();
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MONEY_REQUEST_STEP_CONFIRMATION.getRoute(CONST.IOU.ACTION.CREATE, CONST.IOU.TYPE.TRACK, '1', '100'));
    });

    it.each(trackingCases)('eligible CREATE preserves auto-reporting: policy=$policyAuto, personal=$personalAuto, multi=$multi', async ({policyAuto, personalAuto, multi}) => {
        Object.assign(mockState, {policyAuto, personalAuto, eligible: true});
        const harness = await mount({iouType: CONST.IOU.TYPE.CREATE});
        const ids = multi ? ['1', '2'] : ['1'];
        harness.invoke(ids, multi);
        expect(mockGate).toHaveBeenCalledTimes(1);
        expect(mockPicker).not.toHaveBeenCalled();
        const target = policyAuto || personalAuto ? mockWorkReport : mockSelfReport;
        const reportID = target === mockSelfReport ? CONST.REPORT.UNREPORTED_REPORT_ID : target.reportID;
        for (const id of ids) {
            expect(mockSetReport).toHaveBeenCalledWith(id, {reportID}, true);
            expect(mockParticipants).toHaveBeenCalledWith(id, target, 42);
        }
        harness.flushNavigation();
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MONEY_REQUEST_STEP_CONFIRMATION.getRoute(CONST.IOU.ACTION.CREATE, target === mockSelfReport ? CONST.IOU.TYPE.TRACK : CONST.IOU.TYPE.SUBMIT, '1', target.reportID));
    });

    it.each([CONST.IOU.TYPE.CREATE, CONST.IOU.TYPE.SUBMIT])('rejected %s still opens the picker without state writes', async (iouType) => {
        const harness = await mount({iouType});
        harness.invoke();
        harness.flushNavigation();
        expect(mockPicker).toHaveBeenCalledWith(iouType, '1', '10');
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockSetReport).not.toHaveBeenCalled();
        expect(mockParticipants).not.toHaveBeenCalled();
    });

    it.each([CONST.IOU.TYPE.CREATE, CONST.IOU.TYPE.TRACK])('%s preserves a previously selected different recipient for every receipt', async (iouType) => {
        mockState.eligible = iouType === CONST.IOU.TYPE.CREATE;
        const participants = [{reportID: '300', selected: true, accountID: 99}];
        const transaction = {participants, reportID: '400'} as Props['transaction'];
        const harness = await mount({iouType, transaction, backToReport: 'previous-route'});
        harness.invoke(['1', '2'], true);
        expect(mockPreserveParticipants).toHaveBeenCalledTimes(2);
        expect(mockPreserveParticipants).toHaveBeenCalledWith('1', participants);
        expect(mockPreserveParticipants).toHaveBeenCalledWith('2', participants);
        expect(mockSetReport).not.toHaveBeenCalled();
        harness.flushNavigation();
        expect(mockConfirmation).toHaveBeenCalledWith(iouType, '1', '10', 'previous-route', iouType === CONST.IOU.TYPE.CREATE, '400');
    });

    it('keeps the child mounted and dispatcher stable when route type changes before upload', async () => {
        const harness = await mount({iouType: CONST.IOU.TYPE.CREATE});
        const firstDispatch = harness.getDispatch();
        expect(harness.onMount).toHaveBeenCalledTimes(1);
        await harness.rerender({iouType: CONST.IOU.TYPE.TRACK});
        expect(harness.getDispatch()).toBe(firstDispatch);
        expect(harness.onMount).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
        harness.invoke();
        harness.flushNavigation();
        expect(mockPicker).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MONEY_REQUEST_STEP_CONFIRMATION.getRoute(CONST.IOU.ACTION.CREATE, CONST.IOU.TYPE.TRACK, '1', '100'));
    });

    it('preserves an explicitly selected Self DM over a workspace default', async () => {
        Object.assign(mockState, {policyAuto: true, eligible: true});
        const participants = [{reportID: '100', selected: true}];
        const transaction = {participants, reportID: CONST.REPORT.UNREPORTED_REPORT_ID} as Props['transaction'];
        const harness = await mount({iouType: CONST.IOU.TYPE.CREATE, transaction});
        harness.invoke();
        harness.flushNavigation();
        expect(mockPreserveParticipants).toHaveBeenCalledWith('1', participants);
        expect(mockSetReport).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(ROUTES.MONEY_REQUEST_STEP_CONFIRMATION.getRoute(CONST.IOU.ACTION.CREATE, CONST.IOU.TYPE.TRACK, '1', '100'));
    });
});

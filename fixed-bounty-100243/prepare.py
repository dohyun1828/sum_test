from pathlib import Path
import sys

root = Path(sys.argv[1])
mode = sys.argv[2]
if mode == 'tests':
    p = root / 'tests/ui/components/IOURequestStepConfirmationPageTest.tsx'
    s = p.read_text()
    edits = [
        ("import ScreenWrapper from '@components/ScreenWrapper';", "import ScreenWrapper from '@components/ScreenWrapper';\nimport TestText from '@components/Text';\n\nimport useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';\nimport useOnyx from '@hooks/useOnyx';"),
        ("import CONST from '@src/CONST';", "import {NavigateGlobalCreateProvider, useNavigateGlobalCreate} from '@pages/iou/request/step/IOURequestStepScan/components/NavigateGlobalCreateContext';\n\nimport CONST from '@src/CONST';\nimport type {IOUType} from '@src/CONST';"),
        ("import ROUTES from '@src/ROUTES';", "import ROUTES from '@src/ROUTES';\nimport SCREENS from '@src/SCREENS';"),
    ]
    for old, new in edits:
        if s.count(old) != 1:
            raise SystemExit('Unexpected test source: ' + old)
        s = s.replace(old, new, 1)
    if not s.endswith('});\n'):
        raise SystemExit('Unexpected test ending')
    block = Path(__file__).with_name('route-isolation.test.txt').read_text()
    block = block.replace('React.useState<IOUType>', "React.useState<Exclude<IOUType, 'request'>>")
    block = block.replace('{iouType?: IOUType}', "{iouType?: Exclude<IOUType, 'request'>}")
    block = block.replace('<Text testID="SharedCreateFlowType">{routeIOUType}</Text>', '<TestText testID="SharedCreateFlowType">{routeIOUType}</TestText>')
    block = block.replace('<SharedCreateFlow standalone={standalone} />', '<ScreenWrapper testID="RouteIsolationParent"><SharedCreateFlow standalone={standalone} /></ScreenWrapper>')
    p.write_text(s[:-4] + block + '});\n')
elif mode == 'production':
    p = root / 'src/pages/iou/request/step/IOURequestStepConfirmation.tsx'
    s = p.read_text()
    edits = [
        ('const {iouType, reportID, transactionID: initialTransactionID, action, backToReport, backTo} = params;', 'const {iouType: routeIOUType, reportID, transactionID: initialTransactionID, action, backToReport, backTo} = params;\n    const isGlobalCreateStartPage = route.name === SCREENS.MONEY_REQUEST.CREATE && routeIOUType === CONST.IOU.TYPE.CREATE;'),
        ('    const requestType = getRequestType(transaction);', "    const firstTransactionParticipant = transaction?.participants?.at(0);\n    const isSelfDMParticipant =\n        !!firstTransactionParticipant?.isSelfDM || (!!firstTransactionParticipant?.reportID && firstTransactionParticipant.reportID === selfDMReport?.reportID);\n    // The start-page route is shared by Manual, Scan and Time. Only this confirmation's submit type follows its destination.\n    const iouType = isGlobalCreateStartPage && isSelfDMParticipant ? CONST.IOU.TYPE.TRACK : routeIOUType;\n    const requestType = getRequestType(transaction);"),
        ('                if (iouType !== CONST.IOU.TYPE.TRACK) {', '                if (!isGlobalCreateStartPage && routeIOUType !== CONST.IOU.TYPE.TRACK) {'),
        ('                if (iouType === CONST.IOU.TYPE.SUBMIT || iouType === CONST.IOU.TYPE.TRACK) {', '                if (routeIOUType === CONST.IOU.TYPE.SUBMIT || routeIOUType === CONST.IOU.TYPE.TRACK) {'),
        ('            selfDMReport,\n            iouType,\n            reportID,', '            selfDMReport,\n            iouType,\n            routeIOUType,\n            isGlobalCreateStartPage,\n            reportID,'),
        ('            navigation.setParams({iouType: CONST.IOU.TYPE.TRACK});\n        } else if (firstDefault?.reportID)', '            if (!isGlobalCreateStartPage) {\n                navigation.setParams({iouType: CONST.IOU.TYPE.TRACK});\n            }\n        } else if (firstDefault?.reportID)'),
        ('    }, [transaction?.transactionID, transaction?.participants, defaultParticipants, isManualRequest, navigation]);', '    }, [transaction?.transactionID, transaction?.participants, defaultParticipants, isManualRequest, isGlobalCreateStartPage, navigation]);'),
    ]
    for old, new in edits:
        if s.count(old) != 1:
            raise SystemExit('Unexpected production source: ' + old)
        s = s.replace(old, new, 1)
    p.write_text(s)
else:
    raise SystemExit('Mode must be tests or production')

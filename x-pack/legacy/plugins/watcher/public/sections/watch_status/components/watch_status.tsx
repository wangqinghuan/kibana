/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiPageContent,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiToolTip,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { WatchDetail } from './watch_detail';
import { WatchHistory } from './watch_history';
import { listBreadcrumb, statusBreadcrumb } from '../../../lib/breadcrumbs';
import { loadWatchDetail, deactivateWatch, activateWatch } from '../../../lib/api';
import { WatchDetailsContext } from '../watch_details_context';
import {
  getPageErrorCode,
  PageError,
  SectionLoading,
  DeleteWatchesModal,
} from '../../../components';
import { goToWatchList } from '../../../lib/navigation';

interface WatchStatusTab {
  id: string;
  name: string;
}

const WATCH_EXECUTION_HISTORY_TAB = 'watchExecutionHistoryTab';
const WATCH_ACTIONS_TAB = 'watchActionsTab';

const WATCH_STATUS_TABS: WatchStatusTab[] = [
  {
    id: WATCH_EXECUTION_HISTORY_TAB,
    name: i18n.translate('xpack.watcher.sections.watchStatus.executionHistoryTabLabel', {
      defaultMessage: '执行历史记录',
    }),
  },
  {
    id: WATCH_ACTIONS_TAB,
    name: i18n.translate('xpack.watcher.sections.watchStatus.actionsTabLabel', {
      defaultMessage: '操作状态',
    }),
  },
];

export const WatchStatus = ({
  match: {
    params: { id },
  },
}: {
  match: {
    params: {
      id: string;
    };
  };
}) => {
  const {
    error: watchDetailError,
    data: watchDetail,
    isLoading: isWatchDetailLoading,
  } = loadWatchDetail(id);

  const [selectedTab, setSelectedTab] = useState<string>(WATCH_EXECUTION_HISTORY_TAB);
  const [isActivated, setIsActivated] = useState<boolean | undefined>(undefined);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  const [isTogglingActivation, setIsTogglingActivation] = useState<boolean>(false);

  useEffect(() => {
    chrome.breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb, statusBreadcrumb]);
  }, [id]);

  const errorCode = getPageErrorCode(watchDetailError);

  if (isWatchDetailLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.watcher.sections.watchStatus.loadingWatchDetailsDescription"
          defaultMessage="正在加载监控的详细信息…"
        />
      </SectionLoading>
    );
  }

  if (errorCode) {
    return (
      <EuiPageContent>
        <PageError errorCode={errorCode} id={id} />
      </EuiPageContent>
    );
  }

  if (watchDetail) {
    const { isSystemWatch, id: watchId, watchStatus, name: watchName } = watchDetail;

    if (isActivated === undefined) {
      // Set initial value for isActivated based on the watch we just loaded.
      setIsActivated(typeof watchStatus.isActive !== 'undefined' ? watchStatus.isActive : false);
    }

    const activationButtonText = isActivated ? (
      <FormattedMessage
        id="xpack.watcher.sections.watchHistory.watchTable.deactivateWatchLabel"
        defaultMessage="关闭"
      />
    ) : (
      <FormattedMessage
        id="xpack.watcher.sections.watchHistory.watchTable.activateWatchLabel"
        defaultMessage="激活"
      />
    );

    const toggleWatchActivation = async () => {
      const toggleActivation = isActivated ? deactivateWatch : activateWatch;

      setIsTogglingActivation(true);

      const { error } = await toggleActivation(watchId);

      setIsTogglingActivation(false);

      if (error) {
        const message = isActivated
          ? i18n.translate(
              'xpack.watcher.sections.watchList.toggleActivatationErrorNotification.deactivateDescriptionText',
              {
                defaultMessage: "Couldn't deactivate watch",
              }
            )
          : i18n.translate(
              'xpack.watcher.sections.watchList.toggleActivatationErrorNotification.activateDescriptionText',
              {
                defaultMessage: "Couldn't activate watch",
              }
            );
        return toastNotifications.addDanger(message);
      }

      setIsActivated(!isActivated);
    };

    return (
      <WatchDetailsContext.Provider value={{ watchDetailError, watchDetail, isWatchDetailLoading }}>
        <EuiPageContent>
          <DeleteWatchesModal
            callback={(deleted?: string[]) => {
              if (deleted) {
                goToWatchList();
              }
              setWatchesToDelete([]);
            }}
            watchesToDelete={watchesToDelete}
          />
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h1 data-test-subj="pageTitle">
                  <FormattedMessage
                    id="xpack.watcher.sections.watchDetail.header"
                    defaultMessage="当前'{watch}'的状态"
                    values={{
                      watch: watchName ? watchName : watchId,
                    }}
                  />
                </h1>
              </EuiTitle>
            </EuiFlexItem>
            {isSystemWatch ? (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.watcher.sections.watchDetail.headerBadgeToolipText"
                          defaultMessage="您无法停用或删除系统监控."
                        />
                      }
                    >
                      <EuiBadge color="hollow">
                        <FormattedMessage
                          id="xpack.watcher.sections.watchDetail.headerBadgeText"
                          defaultMessage="系统监控"
                        />
                      </EuiBadge>
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButton
                      onClick={() => {
                        window.history.back();
                      }}
                    >
                      <FormattedMessage
                        id="core.ui.chrome.headerGlobalNav.helpMenuGoToDocumentation_diy"
                        defaultMessage="返回"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : (
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="toggleWatchActivationButton"
                      onClick={() => toggleWatchActivation()}
                      isLoading={isTogglingActivation}
                    >
                      {activationButtonText}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="deleteWatchButton"
                      onClick={() => {
                        setWatchesToDelete([watchId]);
                      }}
                      color="danger"
                      disabled={false}
                    >
                      <FormattedMessage
                        id="xpack.watcher.sections.watchHistory.deleteWatchButtonLabel"
                        defaultMessage="删除监控"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={() => {
                        window.history.back();
                      }}
                    >
                      <FormattedMessage
                        id="core.ui.chrome.headerGlobalNav.helpMenuGoToDocumentation_diy"
                        defaultMessage="返回"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiTabs>
            {WATCH_STATUS_TABS.map((tab, index) => (
              <EuiTab
                onClick={() => {
                  setSelectedTab(tab.id);
                }}
                isSelected={tab.id === selectedTab}
                key={index}
                data-test-subj="tab"
              >
                {tab.name}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="l" />
          {selectedTab === WATCH_ACTIONS_TAB ? <WatchDetail /> : <WatchHistory />}
        </EuiPageContent>
      </WatchDetailsContext.Provider>
    );
  }

  return null;
};

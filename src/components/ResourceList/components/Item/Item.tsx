import * as React from 'react';
import {classNames} from '@shopify/react-utilities/styles';
import {createUniqueIDFactory, noop} from '@shopify/javascript-utilities/other';
import {DisableableAction, WithContextTypes} from '../../../../types';
import ActionList from '../../../ActionList';
import Popover from '../../../Popover';
import {Props as AvatarProps} from '../../../Avatar';
import UnstyledLink from '../../../UnstyledLink';
import {Props as ThumbnailProps} from '../../../Thumbnail';
import ButtonGroup from '../../../ButtonGroup';
import Checkbox from '../../../Checkbox';
import Button, {buttonsFrom} from '../../../Button';
import {WithAppProviderProps} from '../../../AppProvider';
import {usePolaris} from '../../../../hooks';

import {SELECT_ALL_ITEMS} from '../../types';
import ResourceListContext, {ResourceListContextType} from '../../context';
import styles from './Item.scss';

export type ExceptionStatus = 'neutral' | 'warning' | 'critical';
export type MediaSize = 'small' | 'medium' | 'large';
export type MediaType = 'avatar' | 'thumbnail';

export interface BaseProps {
  /** Visually hidden text for screen readers */
  accessibilityLabel?: string;
  /** Id of the element the item onClick controls */
  ariaControls?: string;
  /** Tells screen reader the controlled element is expanded */
  ariaExpanded?: boolean;
  /** Unique identifier for the item */
  id: string;
  media?: React.ReactElement<AvatarProps | ThumbnailProps>;
  persistActions?: boolean;
  shortcutActions?: DisableableAction[];
  children?: React.ReactNode;
}

export interface PropsWithUrl extends BaseProps {
  url: string;
  onClick?(id?: string): void;
}

export interface PropsWithClick extends BaseProps {
  url?: string;
  onClick(id?: string): void;
}

export type Props = PropsWithUrl | PropsWithClick;

export interface State {
  actionsMenuVisible: boolean;
  focused: boolean;
  focusedInner: boolean;
}

export type CombinedProps =
  | PropsWithUrl &
      WithAppProviderProps &
      WithContextTypes<ResourceListContextType>
  | PropsWithClick &
      WithAppProviderProps &
      WithContextTypes<ResourceListContextType>;

const getUniqueCheckboxID = createUniqueIDFactory('ResourceListItemCheckbox');

export default React.memo(function Item({
  children,
  url,
  media,
  shortcutActions,
  ariaControls,
  ariaExpanded,
  persistActions = false,
  accessibilityLabel,
  id,
  onClick = noop,
}: Props) {
  const [actionsMenuVisible, setActionsMenuVisible] = React.useState(false);
  const [{focused, focusedInner}, setFocusState] = React.useState({
    focused: false,
    focusedInner: false,
  });

  const node = React.useRef<HTMLDivElement>(null);
  const checkboxId = React.useRef(getUniqueCheckboxID());
  const {intl} = usePolaris();
  const {
    selectable,
    selectMode,
    loading,
    onSelectionChange,
    selectedItems,
  } = React.useContext(ResourceListContext);

  const selected = isSelected();

  let ownedMarkup: React.ReactNode = null;
  let handleMarkup: React.ReactNode = null;

  const handleAnchorFocus = React.useCallback(() => {
    setFocusState({focused: true, focusedInner: false});
  }, []);

  const handleFocusedBlur = React.useCallback(() => {
    setFocusState({focused: true, focusedInner: true});
  }, []);

  const handleFocus = React.useCallback(() => {
    setFocusState(({focusedInner}) => ({focused: true, focusedInner}));
  }, []);

  const handleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      const isInside = compareEventNode(event);
      if (
        node.current == null ||
        !node.current.contains(event.relatedTarget as HTMLElement)
      ) {
        setFocusState(({focusedInner}) => ({focused: false, focusedInner}));
      } else if (isInside) {
        setFocusState(({focused}) => ({focused, focusedInner: true}));
      }
    },
    [],
  );

  const handleMouseDown = React.useCallback(() => {
    setFocusState(({focused}) => ({focused, focusedInner: true}));
  }, []);

  const handleLargerSelectionArea = React.useCallback(
    (event: React.MouseEvent<any>) => {
      stopPropagation(event);
      handleSelection(!selected);
    },
    [selected],
  );

  const handleSelection = React.useCallback(
    (value: boolean) => {
      if (id == null || onSelectionChange == null) {
        return;
      }

      setFocusState({focused: true, focusedInner: true});
      onSelectionChange(value, id);
    },
    [id, onSelectionChange],
  );

  const handleClick = React.useCallback(
    (event: React.MouseEvent<any>) => {
      const {ctrlKey, metaKey} = event.nativeEvent;
      const anchor = node.current && node.current.querySelector('a');

      if (selectMode) {
        handleLargerSelectionArea(event);
        return;
      }

      if (anchor === event.target) {
        return;
      }

      if (onClick !== noop) {
        onClick(id);
      }

      if (url && (ctrlKey || metaKey)) {
        window.open(url, '_blank');
        return;
      }

      if (url && anchor) {
        anchor.click();
      }
    },
    [selectMode, onClick, url],
  );

  const handleKeypress = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      const {key} = event;

      if (key === 'Enter' && !selectMode) {
        onClick();
      }
    },
    [selectMode],
  );

  const handleActionsClick = React.useCallback(() => {
    setActionsMenuVisible((actionsMenuVisible) => !actionsMenuVisible);
  }, []);

  const handleCloseRequest = React.useCallback(() => {
    setActionsMenuVisible(false);
  }, []);

  const mediaMarkup = media ? (
    <div className={styles.Media} testID="Media">
      {media}
    </div>
  ) : null;

  const checkboxAccessibilityLabel =
    accessibilityLabel || intl.translate('Polaris.Common.checkbox');

  if (selectable) {
    const label = selected
      ? intl.translate('Polaris.ResourceList.Item.deselectItem', {
          accessibilityLabel: checkboxAccessibilityLabel,
        })
      : intl.translate('Polaris.ResourceList.Item.selectItem', {
          accessibilityLabel: checkboxAccessibilityLabel,
        });

    handleMarkup = (
      <div
        className={styles.Handle}
        onClick={handleLargerSelectionArea}
        testID="LargerSelectionArea"
      >
        <div onClick={stopPropagation} className={styles.CheckboxWrapper}>
          <Checkbox
            testID="Checkbox"
            id={checkboxId.current}
            label={label}
            labelHidden
            onChange={handleSelection}
            checked={selected}
            disabled={loading}
          />
        </div>
      </div>
    );
  }

  if (media || selectable) {
    ownedMarkup = (
      <div className={styles.Owned}>
        {handleMarkup}
        {mediaMarkup}
      </div>
    );
  }

  const className = classNames(
    styles.Item,
    focused && styles.focused,
    selectable && styles.selectable,
    selected && styles.selected,
    selectMode && styles.selectMode,
    persistActions && styles.persistActions,
    focusedInner && styles.focusedInner,
  );

  let actionsMarkup: React.ReactNode | null = null;
  let disclosureMarkup: React.ReactNode | null = null;

  if (shortcutActions && !loading) {
    if (persistActions) {
      actionsMarkup = (
        <div className={styles.Actions} onClick={stopPropagation}>
          <ButtonGroup>
            {buttonsFrom(shortcutActions, {
              size: 'slim',
              plain: true,
            })}
          </ButtonGroup>
        </div>
      );

      disclosureMarkup = (
        <div className={styles.Disclosure} onClick={stopPropagation}>
          <Popover
            activator={
              <Button
                aria-label={intl.translate(
                  'Polaris.ResourceList.Item.actionsDropdown',
                )}
                onClick={handleActionsClick}
                plain
                icon="horizontalDots"
              />
            }
            onClose={handleCloseRequest}
            active={actionsMenuVisible}
          >
            <ActionList items={shortcutActions} />
          </Popover>
        </div>
      );
    } else {
      actionsMarkup = (
        <div className={styles.Actions} onClick={stopPropagation}>
          <ButtonGroup segmented testID="ShortcutActions">
            {buttonsFrom(shortcutActions, {
              size: 'slim',
            })}
          </ButtonGroup>
        </div>
      );
    }
  }

  const content = children ? (
    <div className={styles.Content}>{children}</div>
  ) : null;

  const containerMarkup = (
    <div testID="Item-Content" className={styles.Container} id={id}>
      {ownedMarkup}
      {content}
      {actionsMarkup}
      {disclosureMarkup}
    </div>
  );

  const tabIndex = loading ? -1 : 0;

  const accessibleMarkup = url ? (
    <UnstyledLink
      aria-describedby={id}
      aria-label={accessibilityLabel}
      className={styles.Link}
      url={url}
      onFocus={handleAnchorFocus}
      onBlur={handleFocusedBlur}
      tabIndex={tabIndex}
    />
  ) : (
    <button
      className={styles.Button}
      aria-label={accessibilityLabel}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      onClick={handleClick}
      onFocus={handleAnchorFocus}
      onBlur={handleFocusedBlur}
      tabIndex={tabIndex}
    />
  );

  return (
    <div
      ref={node}
      className={className}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      onKeyUp={handleKeypress}
      testID="Item-Wrapper"
      data-href={url}
    >
      {accessibleMarkup}
      {containerMarkup}
    </div>
  );

  function isSelected() {
    return (
      selectedItems &&
      ((Array.isArray(selectedItems) && selectedItems.includes(id)) ||
        selectedItems === SELECT_ALL_ITEMS)
    );
  }

  function compareEventNode(event: React.FocusEvent<HTMLElement>) {
    return onClick !== noop
      ? event.target === node.current
      : (event.target as HTMLElement).tagName.toLowerCase() === 'a';
  }
});

function stopPropagation(event: React.MouseEvent<any>) {
  event.stopPropagation();
}

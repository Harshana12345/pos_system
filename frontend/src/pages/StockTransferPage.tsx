import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { ApiError } from '@/services/apiClient';
import { listInventory, type InventoryItem } from '@/services/inventoryService';

type StockTransferPageProps = {
  accessToken: string;
  userName?: string;
};

type BranchOption = {
  id: number;
  name: string;
};

type TransferFormValues = {
  sourceBranchId: string;
  destinationBranchId: string;
  inventoryId: string;
  quantity: string;
  reference: string;
};

const EMPTY_FORM_VALUES: TransferFormValues = {
  sourceBranchId: '',
  destinationBranchId: '',
  inventoryId: '',
  quantity: '',
  reference: '',
};

function getItemLabel(item: InventoryItem) {
  return item.variant ? `${item.product.name} - ${item.variant.name}` : item.product.name;
}

function getBranchOptions(items: InventoryItem[]) {
  const branchMap = new Map<number, BranchOption>();

  items.forEach((item) => {
    if (!branchMap.has(item.branch.id)) {
      branchMap.set(item.branch.id, {
        id: item.branch.id,
        name: item.branch.name,
      });
    }
  });

  return Array.from(branchMap.values()).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}

function findMatchingDestinationItem(
  inventory: InventoryItem[],
  selectedItem: InventoryItem | undefined,
  destinationBranchId: string,
) {
  if (!selectedItem || !destinationBranchId) {
    return undefined;
  }

  return inventory.find(
    (item) =>
      String(item.branchId) === destinationBranchId &&
      item.productId === selectedItem.productId &&
      (item.variantId ?? null) === (selectedItem.variantId ?? null),
  );
}

export function StockTransferPage({ accessToken, userName }: StockTransferPageProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [formValues, setFormValues] = useState<TransferFormValues>(EMPTY_FORM_VALUES);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadInventory() {
      setIsLoading(true);
      setError('');

      try {
        const response = await listInventory(accessToken);

        if (isMounted) {
          setInventory(response.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError('Unable to load inventory. Check your connection and try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInventory();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const branchOptions = useMemo(() => getBranchOptions(inventory), [inventory]);
  const sourceBranchItems = useMemo(
    () =>
      inventory
        .filter(
          (item) => String(item.branchId) === formValues.sourceBranchId && item.quantity > 0,
        )
        .sort((first, second) => getItemLabel(first).localeCompare(getItemLabel(second))),
    [formValues.sourceBranchId, inventory],
  );
  const selectedItem = useMemo(
    () => inventory.find((item) => String(item.id) === formValues.inventoryId),
    [formValues.inventoryId, inventory],
  );
  const destinationItem = useMemo(
    () => findMatchingDestinationItem(inventory, selectedItem, formValues.destinationBranchId),
    [formValues.destinationBranchId, inventory, selectedItem],
  );
  const destinationOptions = branchOptions.filter(
    (branch) => String(branch.id) !== formValues.sourceBranchId,
  );
  const parsedQuantity = Number(formValues.quantity);
  const hasValidQuantity =
    formValues.quantity.trim() !== '' &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0;
  const sourceRemaining =
    selectedItem && hasValidQuantity ? selectedItem.quantity - parsedQuantity : undefined;
  const destinationProjected =
    hasValidQuantity && destinationItem
      ? destinationItem.quantity + parsedQuantity
      : hasValidQuantity
        ? parsedQuantity
        : undefined;
  const canSubmit =
    Boolean(formValues.sourceBranchId) &&
    Boolean(formValues.destinationBranchId) &&
    Boolean(selectedItem) &&
    hasValidQuantity &&
    Boolean(selectedItem && parsedQuantity <= selectedItem.quantity);

  function updateFormValue(field: keyof TransferFormValues, value: string) {
    setFormError('');
    setFormSuccess('');
    setFormValues((currentValues) => {
      if (field === 'sourceBranchId') {
        return {
          ...currentValues,
          destinationBranchId:
            currentValues.destinationBranchId === value ? '' : currentValues.destinationBranchId,
          inventoryId: '',
          quantity: '',
          sourceBranchId: value,
        };
      }

      if (field === 'inventoryId') {
        return {
          ...currentValues,
          inventoryId: value,
          quantity: '',
        };
      }

      return {
        ...currentValues,
        [field]: value,
      };
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formValues.sourceBranchId) {
      setFormError('Select a source branch.');
      return;
    }

    if (!formValues.destinationBranchId) {
      setFormError('Select a destination branch.');
      return;
    }

    if (formValues.sourceBranchId === formValues.destinationBranchId) {
      setFormError('Source and destination branches must be different.');
      return;
    }

    if (!selectedItem) {
      setFormError('Select a product from the source branch.');
      return;
    }

    if (!hasValidQuantity) {
      setFormError('Enter a positive whole-number quantity.');
      return;
    }

    if (parsedQuantity > selectedItem.quantity) {
      setFormError('Transfer quantity cannot exceed source branch stock.');
      return;
    }

    const sourceBranchName = selectedItem.branch.name;
    const destinationBranchName =
      branchOptions.find((branch) => String(branch.id) === formValues.destinationBranchId)?.name ??
      'destination branch';

    setFormSuccess(
      `${parsedQuantity} units of ${getItemLabel(selectedItem)} prepared for transfer from ${sourceBranchName} to ${destinationBranchName}.`,
    );
    setFormValues((currentValues) => ({
      ...currentValues,
      quantity: '',
      reference: '',
    }));
  }

  return (
    <MainLayout>
      <section className="page-header employee-header">
        <div>
          <p className="eyebrow">Inventory</p>
          <h1>Stock Transfer</h1>
          <p className="summary">
            {userName
              ? `Welcome back, ${userName}. Move stock between branches with source, destination, and item checks.`
              : 'Move stock between branches with source, destination, and item checks.'}
          </p>
        </div>
        <div className="product-stats">
          <div className="employee-stat" aria-label={`${branchOptions.length} branches available`}>
            <span>{branchOptions.length}</span>
            <p>Branches</p>
          </div>
          <div className="employee-stat" aria-label={`${inventory.length} stock records available`}>
            <span>{inventory.length}</span>
            <p>Stock records</p>
          </div>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="transfer-form-title">
        <div className="form-panel-header">
          <div>
            <h2 id="transfer-form-title">Create Transfer</h2>
            <p>Select the source branch, destination branch, product, and transfer quantity.</p>
          </div>
        </div>

        {error ? (
          <div className="table-message table-message-error" role="alert">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="table-message" role="status">
            Loading inventory...
          </div>
        ) : null}

        {!isLoading && !error ? (
          <form className="stock-transfer-form" onSubmit={handleSubmit}>
            <label className="field" htmlFor="transfer-source-branch">
              Source Branch
              <select
                id="transfer-source-branch"
                onChange={(event) => updateFormValue('sourceBranchId', event.target.value)}
                required
                value={formValues.sourceBranchId}
              >
                <option value="">Select source</option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="transfer-destination-branch">
              Destination Branch
              <select
                disabled={!formValues.sourceBranchId}
                id="transfer-destination-branch"
                onChange={(event) =>
                  updateFormValue('destinationBranchId', event.target.value)
                }
                required
                value={formValues.destinationBranchId}
              >
                <option value="">Select destination</option>
                {destinationOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field stock-transfer-product" htmlFor="transfer-product">
              Product
              <select
                disabled={!formValues.sourceBranchId}
                id="transfer-product"
                onChange={(event) => updateFormValue('inventoryId', event.target.value)}
                required
                value={formValues.inventoryId}
              >
                <option value="">Select product</option>
                {sourceBranchItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getItemLabel(item)} | SKU {item.variant?.sku ?? item.product.sku} |{' '}
                    {item.quantity} available
                  </option>
                ))}
              </select>
            </label>

            <label className="field" htmlFor="transfer-quantity">
              Quantity
              <input
                aria-invalid={
                  formValues.quantity.trim() !== '' &&
                  (!hasValidQuantity ||
                    Boolean(selectedItem && parsedQuantity > selectedItem.quantity))
                }
                disabled={!selectedItem}
                id="transfer-quantity"
                min="1"
                onChange={(event) => updateFormValue('quantity', event.target.value)}
                step="1"
                type="number"
                value={formValues.quantity}
              />
            </label>

            <label className="field stock-transfer-reference" htmlFor="transfer-reference">
              Reference
              <input
                id="transfer-reference"
                onChange={(event) => updateFormValue('reference', event.target.value)}
                placeholder="Optional note or request number"
                type="text"
                value={formValues.reference}
              />
            </label>

            <div className="transfer-summary">
              <div>
                <span>Source after transfer</span>
                <strong>{sourceRemaining === undefined ? '--' : sourceRemaining}</strong>
              </div>
              <div>
                <span>Destination after transfer</span>
                <strong>{destinationProjected === undefined ? '--' : destinationProjected}</strong>
              </div>
              <p>
                {selectedItem
                  ? `${selectedItem.branch.name} has ${selectedItem.quantity} units available.`
                  : 'Select a source product to preview stock movement.'}
              </p>
            </div>

            {formError ? (
              <div className="form-alert stock-transfer-wide" role="alert">
                {formError}
              </div>
            ) : null}

            {formSuccess ? (
              <div className="form-alert form-alert-success stock-transfer-wide" role="status">
                {formSuccess}
              </div>
            ) : null}

            <div className="form-actions stock-transfer-wide">
              <button className="primary-action" disabled={!canSubmit} type="submit">
                Create Transfer
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </MainLayout>
  );
}

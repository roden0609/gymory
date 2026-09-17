export type PublicGymMachine = {
  id: string;
  name: string;
  modelNumber: string | null;
  quantity: number | null;
  verifiedStatus: "admin_verified" | "owner_verified";
  category: {
    id: string;
    name: string;
    sortOrder: number;
  };
  brand: {
    id: string;
    nameEn: string;
    nameZh: string | null;
  };
};

export type PublicGymMachineBrandGroup = {
  brand: PublicGymMachine["brand"];
  machines: PublicGymMachine[];
};

export type PublicGymMachineCategoryGroup = {
  category: PublicGymMachine["category"];
  brands: PublicGymMachineBrandGroup[];
};

export function groupPublicGymMachines(
  machines: PublicGymMachine[]
): PublicGymMachineCategoryGroup[] {
  const categories = new Map<string, PublicGymMachineCategoryGroup>();

  for (const machine of machines) {
    let categoryGroup = categories.get(machine.category.id);
    if (!categoryGroup) {
      categoryGroup = { category: machine.category, brands: [] };
      categories.set(machine.category.id, categoryGroup);
    }

    let brandGroup = categoryGroup.brands.find(
      ({ brand }) => brand.id === machine.brand.id
    );
    if (!brandGroup) {
      brandGroup = { brand: machine.brand, machines: [] };
      categoryGroup.brands.push(brandGroup);
    }
    brandGroup.machines.push(machine);
  }

  return [...categories.values()]
    .sort(
      (left, right) =>
        left.category.sortOrder - right.category.sortOrder ||
        left.category.name.localeCompare(right.category.name)
    )
    .map((categoryGroup) => ({
      ...categoryGroup,
      brands: categoryGroup.brands
        .sort((left, right) => left.brand.nameEn.localeCompare(right.brand.nameEn))
        .map((brandGroup) => ({
          ...brandGroup,
          machines: brandGroup.machines.sort((left, right) =>
            left.name.localeCompare(right.name)
          ),
        })),
    }));
}

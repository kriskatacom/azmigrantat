import AppButton from "@/components/ui/AppButton";
import { useAppTheme } from "@/app/_layout";
import type { AuthUser, Gender, UpdateProfilePayload } from "@/types/auth";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import CountryField from "./country-field";
import GenderField from "./gender-field";
import PhoneNumberField from "./phone-number-field";
import ProfileField from "./profile-field";

export type ProfileDetailsSection = "personal" | "contact";

interface ProfileDetailsFormProps {
  user: AuthUser;
  section: ProfileDetailsSection;
  isSaving: boolean;
  onSave: (payload: UpdateProfilePayload) => Promise<void>;
}

function fullPayload(
  user: AuthUser,
  patch: Partial<UpdateProfilePayload>,
): UpdateProfilePayload {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    gender: user.gender ?? null,
    phone: user.phone ?? "",
    country: user.country ?? "",
    city: user.city ?? "",
    address: user.address ?? "",
    bio: user.bio ?? "",
    ...patch,
  };
}

export default function ProfileDetailsForm({
  user,
  section,
  isSaving,
  onSave,
}: ProfileDetailsFormProps) {
  const { theme } = useAppTheme();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [gender, setGender] = useState<Gender | null>(user.gender ?? null);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [country, setCountry] = useState(user.country ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [bio, setBio] = useState(user.bio ?? "");

  useEffect(() => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setGender(user.gender ?? null);
    setPhone(user.phone ?? "");
    setCountry(user.country ?? "");
    setCity(user.city ?? "");
    setAddress(user.address ?? "");
    setBio(user.bio ?? "");
  }, [user]);

  const canSave =
    section === "contact" ||
    (firstName.trim().length > 0 && lastName.trim().length > 0);

  const handleSave = () => {
    if (section === "personal") {
      void onSave(
        fullPayload(user, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          bio: bio.trim(),
        }),
      );
      return;
    }

    void onSave(
      fullPayload(user, {
        phone: phone.trim(),
        country: country.trim(),
        city: city.trim(),
        address: address.trim(),
      }),
    );
  };

  return (
    <View style={styles.form}>
      {section === "personal" ? (
        <>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <ProfileField
                label="Име"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.nameField}>
              <ProfileField
                label="Фамилия"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>
          <View>
            <ProfileField
              label="Биография"
              value={bio}
              onChangeText={(value) => setBio(value.slice(0, 280))}
              placeholder="Разкажете накратко за себе си"
              multiline
              maxLength={280}
              style={styles.bio}
            />
            <Text style={[styles.counter, { color: theme.colors.textSecondary }]}>
              {bio.trim().length}/280
            </Text>
          </View>
          <GenderField value={gender} onChange={setGender} />
        </>
      ) : (
        <>
          <PhoneNumberField value={phone} onChange={setPhone} />
          <CountryField value={country} onChange={setCountry} />
          <ProfileField
            label="Град"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
            placeholder="Въведете град"
          />
          <ProfileField
            label="Физически адрес"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
            autoComplete="street-address"
            placeholder="Улица, номер, пощенски код"
            multiline
            style={styles.address}
          />
        </>
      )}
      <AppButton
        title="Запази промените"
        loading={isSaving}
        disabled={!canSave}
        onPress={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  nameRow: { flexDirection: "row", gap: 12 },
  nameField: { flex: 1 },
  address: { minHeight: 82, textAlignVertical: "top" },
  bio: { minHeight: 96, textAlignVertical: "top" },
  counter: { marginTop: 6, fontSize: 12, fontWeight: "600", textAlign: "right" },
});

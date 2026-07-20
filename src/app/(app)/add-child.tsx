import { useAuth } from "@clerk/expo"
import * as Sentry from "@sentry/react-native"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import { StatusBar } from "expo-status-bar"
import { SymbolView } from "expo-symbols"
import { useCallback, useMemo, useState } from "react"
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native"

import { ChildAvatar, PRESET_KEYS } from "@/components/child-avatar"
import { RoundedHeading } from "@/components/rounded-heading"
import { SafeAreaView } from "@/components/styled"
import { colors } from "@/design/tokens"
import { type Avatar, type CardTint, CARD_TINTS, DEFAULT_AVATAR, suggestTint, tintClass, useChildren } from "@/lib/children"
import { useParentGate } from "@/lib/parent-gate"

const YEAR_GROUPS = ["Rec", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6"] as const

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const

// A child in Reception is ~4–5, so ~14 years back covers Rec–Y6 with room to spare.
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 14 }, (_, i) => `${CURRENT_YEAR - 4 - i}`)

// Fun emoji faces offered alongside the preset illustrations. iOS has no public API to pick
// a user's Memoji directly (Memoji surface only through the system keyboard's sticker input),
// so emoji stand in for "choose an icon"; a saved Memoji can still come in via upload.
const EMOJI = ["🐻", "🐰", "🐼", "🐨", "🐸", "🦄", "🐯", "🐷", "🐵", "🐶"] as const

function FieldLabel({ children }: { children: string }) {
  return <Text className="font-text text-body font-medium text-ink">{children}</Text>
}

/** Picker face — the value (or a muted placeholder) on the left, a chevron on the right. */
function Select({
  value,
  placeholder,
  onPress,
}: {
  value: string | null
  placeholder: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="mt-2 h-12 flex-row items-center justify-between rounded-md border border-border bg-white px-4 active:opacity-70"
      onPress={onPress}
    >
      <Text className={`font-text text-field ${value ? "text-ink" : "text-text-secondary"}`}>
        {value ?? placeholder}
      </Text>
      <SymbolView name="chevron.down" size={16} tintColor={colors["text-secondary"]} />
    </Pressable>
  )
}

/** Slide-up sheet listing the options for one field. */
function PickerSheet({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string
  options: readonly string[]
  selected: string | null
  onSelect: (value: string) => void
  onClose: () => void
}) {
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        {/* Stops taps on the sheet body from dismissing it. */}
        <Pressable
          className="max-h-96 rounded-t-2xl bg-background pb-8 pt-2"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="h-1 w-10 self-center rounded-full bg-border" />
          <Text className="mt-3 mb-1 text-center font-text text-body-lg font-semibold text-ink">
            {title}
          </Text>
          <ScrollView>
            {options.map((option) => {
              const active = option === selected
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  className="h-13 flex-row items-center justify-between px-8 active:opacity-60"
                  onPress={() => onSelect(option)}
                >
                  <Text
                    className={`font-text text-field ${active ? "font-semibold text-primary" : "text-ink"}`}
                  >
                    {option}
                  </Text>
                  {active ? (
                    <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
                  ) : null}
                </Pressable>
              )
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/** Picture picker: preset illustrations, emoji, or an upload from camera / photo library. */
function AvatarSheet({
  selected,
  onSelect,
  onClose,
}: {
  selected: Avatar
  onSelect: (avatar: Avatar) => void
  onClose: () => void
}) {
  async function upload(source: "camera" | "library") {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync()
      // Denied permission is a user choice, not an error — leave the avatar as it was.
      if (!permission.granted) return
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            })
      if (!result.canceled) onSelect({ kind: "image", uri: result.assets[0].uri })
    } catch (error) {
      Sentry.captureException(error, { tags: { flow: "add-child-avatar", source } })
    }
  }

  const isPreset = (value: string) => selected.kind === "preset" && selected.value === value
  const isEmoji = (value: string) => selected.kind === "emoji" && selected.value === value

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <Pressable
          className="rounded-t-2xl bg-background px-6 pb-8 pt-2"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="h-1 w-10 self-center rounded-full bg-border" />
          <Text className="mt-3 mb-4 text-center font-text text-body-lg font-semibold text-ink">
            Choose a picture
          </Text>

          <Text className="mb-2 font-text text-body font-medium text-ink">Icons</Text>
          <View className="flex-row gap-3">
            {PRESET_KEYS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: isPreset(key) }}
                className={`h-16 w-16 rounded-full active:opacity-70 ${
                  isPreset(key) ? "border-2 border-primary" : ""
                }`}
                onPress={() => onSelect({ kind: "preset", value: key })}
              >
                <ChildAvatar avatar={{ kind: "preset", value: key }} />
              </Pressable>
            ))}
          </View>

          <Text className="mb-2 mt-5 font-text text-body font-medium text-ink">Emoji</Text>
          <View className="flex-row flex-wrap gap-3">
            {EMOJI.map((glyph) => (
              <Pressable
                key={glyph}
                accessibilityRole="button"
                accessibilityState={{ selected: isEmoji(glyph) }}
                className={`h-14 w-14 items-center justify-center rounded-full bg-white active:opacity-70 ${
                  isEmoji(glyph) ? "border-2 border-primary" : "border border-border"
                }`}
                onPress={() => onSelect({ kind: "emoji", value: glyph })}
              >
                <Text className="text-h2">{glyph}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            className="mt-6 h-13 flex-row items-center justify-center gap-2 rounded-md border border-border bg-white active:opacity-70"
            onPress={() => upload("camera")}
          >
            <SymbolView name="camera.fill" size={20} tintColor={colors.ink} />
            <Text className="font-text text-body-lg font-semibold text-ink">Take Photo</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="mt-3 h-13 flex-row items-center justify-center gap-2 rounded-md border border-border bg-white active:opacity-70"
            onPress={() => upload("library")}
          >
            <SymbolView name="photo.on.rectangle" size={20} tintColor={colors.ink} />
            <Text className="font-text text-body-lg font-semibold text-ink">Choose from Library</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

type OpenSheet = "month" | "year" | null

export default function AddChild() {
  const { addChild, updateChild, removeChild, children } = useChildren()
  const { signOut } = useAuth()
  const { unlocked } = useParentGate()

  // Same screen serves add and edit. With an `id` param it edits that child (prefilled form,
  // "Save changes", delete option); without one it adds a new child.
  const { id } = useLocalSearchParams<{ id?: string }>()
  const existing = children.find((c) => c.id === id)
  const editing = !!existing

  // Onboarding: signed in, first child not created yet. The back control is deliberately hidden
  // here (a child is required to proceed), which leaves a parent who signed in with the wrong
  // Apple ID with no way forward and no way out. Sign out is that escape hatch — the only reason
  // it appears on this screen and not on the other child-facing ones.
  const onboarding = !editing && children.length === 0

  function confirmSignOut() {
    Alert.alert("Sign out?", "You'll need to sign back in with Apple or Google.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ])
  }

  // Leave the form back to who's-studying. Prefer popping the pushed screen; if there is no
  // history (reached fresh — e.g. a deep link) fall back to replacing into home so a parent
  // who already has a child is never trapped on this form.
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace("/home")
  }, [])

  // State initializers run once — seed from the edited child when present.
  const [name, setName] = useState(existing?.name ?? "")
  const [avatar, setAvatar] = useState<Avatar>(existing?.avatar ?? DEFAULT_AVATAR)
  // §2 "Avatar Customisation". The card colour used to be assigned by hashing the child's id, so a
  // parent could pick the picture but not the card their child actually recognises. An existing
  // child with no stored tint keeps the colour they have always had — `washFor` falls back to the
  // same hash, so opening the form does not silently repaint their card.
  const [tint, setTint] = useState<CardTint>(suggestTint(existing, children))
  const [yearGroup, setYearGroup] = useState<string | null>(existing?.yearGroup ?? null)
  const [birthMonth, setBirthMonth] = useState<string | null>(existing?.birthMonth ?? null)
  const [birthYear, setBirthYear] = useState<string | null>(existing?.birthYear ?? null)
  const [sheet, setSheet] = useState<OpenSheet>(null)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canSubmit = useMemo(
    () => name.trim().length > 0 && !!yearGroup && !!birthMonth && !!birthYear && !saving && !deleting,
    [name, yearGroup, birthMonth, birthYear, saving, deleting]
  )

  async function onSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      const fields = {
        name: name.trim(),
        avatar,
        tint,
        yearGroup: yearGroup!,
        birthMonth: birthMonth!,
        birthYear: birthYear!,
      }
      if (editing) await updateChild(existing!.id, fields)
      else await addChild(fields)
      // Return to who's-studying. Pushed from there → back to it (re-renders with the change);
      // reached as onboarding (no history) → replace into it.
      goBack()
    } finally {
      // On failure stay on the form (useChildren already reported to Sentry) so the parent
      // can retry rather than losing what they typed.
      setSaving(false)
    }
  }

  function onDelete() {
    if (!editing) return
    Alert.alert(
      `Remove ${existing!.name}?`,
      "This deletes their profile and study progress on this account. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true)
            try {
              await removeChild(existing!.id)
              goBack()
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  // Child management is a parent action, so the only ungated entry to this form is first-run
  // onboarding — creating the very first child, before a gate could even be set. Every other case
  // (editing an existing child, which exposes "Delete child", or adding a second child, which opens
  // the camera and photo library) requires the gate. A direct deep link to /add-child or
  // /add-child?id=... while locked lands on the parent-gated children manager instead. Placed after
  // every hook to keep hook order stable.
  if (!onboarding && !unlocked) return <Redirect href="/children" />

  return (
    <SafeAreaView className="flex-1 bg-background px-8">
      <StatusBar style="dark" />

      {/* Header: centred title with the back control pinned to the left edge. Shown whenever the
          parent already has a child (they can return to who's-studying to pick a different one).
          During first-child onboarding a child is required to proceed, so back is replaced by Sign
          out on the right — the parent still needs one way off this screen. The button renders
          after the heading so its tap zone sits above the full-width centred title rather than
          under it. */}
      <View className="mt-10 h-9 justify-center">
        <RoundedHeading
          color={colors.ink}
          fallbackClassName="text-center text-h2 font-bold text-ink"
          size={28}
          weight="bold"
        >
          {editing ? "Edit child" : "Add a child"}
        </RoundedHeading>
        {onboarding ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            className="absolute right-0 h-9 justify-center active:opacity-60"
            hitSlop={8}
            onPress={confirmSignOut}
          >
            <Text className="font-text text-body-lg font-semibold text-text-secondary">Sign out</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="absolute left-0 h-9 w-9 justify-center active:opacity-60"
            hitSlop={8}
            onPress={goBack}
          >
            <SymbolView name="chevron.left" size={24} tintColor={colors.ink} weight="medium" />
          </Pressable>
        )}
      </View>

      {/* Avatar. The ring holds the chosen picture in the chosen card colour; the camera badge
          opens the picker (preset icon, emoji, or an uploaded photo). */}
      <View className="mt-2 items-center">
        <View className={`h-avatar w-avatar overflow-hidden rounded-full ${tintClass(tint)}`}>
          <ChildAvatar avatar={avatar} className="h-full w-full bg-transparent" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change child's picture"
            className="absolute bottom-1 right-1 h-11 w-11 items-center justify-center rounded-full border border-border bg-white shadow-elevated active:opacity-80"
            hitSlop={8}
            onPress={() => setAvatarOpen(true)}
          >
            <SymbolView name="camera.fill" size={20} tintColor={colors.ink} />
          </Pressable>
        </View>
      </View>

      {/* §2 "Avatar Customisation" — the card colour, which was previously assigned by hashing the
          child's id and could not be chosen. Sits under the avatar so a tap shows its own result in
          the ring above. Colour is a real recognition cue for a pre-reader picking their own card. */}
      <View className="mt-4 flex-row items-center justify-center gap-3">
        {CARD_TINTS.map((option) => {
          const chosen = option === tint
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Card colour ${option}`}
              accessibilityState={{ selected: chosen }}
              className={`h-9 w-9 items-center justify-center rounded-full border-2 ${
                chosen ? "border-primary" : "border-border"
              } ${tintClass(option)} active:opacity-70`}
              hitSlop={6}
              onPress={() => setTint(option)}
            >
              {chosen ? (
                <SymbolView name="checkmark" size={14} tintColor={colors.ink} weight="bold" />
              ) : null}
            </Pressable>
          )
        })}
      </View>

      {/* First name */}
      <View className="mt-3">
        <FieldLabel>First name</FieldLabel>
        <TextInput
          className="mt-3 h-13 rounded-md border border-border bg-white px-4 font-text text-field text-ink"
          placeholder="First name"
          placeholderTextColor={colors["text-secondary"]}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={40}
        />
      </View>

      {/* Year group */}
      <View className="mt-6">
        <FieldLabel>Year group</FieldLabel>
        <View className="mt-3 flex-row gap-2">
          {YEAR_GROUPS.map((year) => {
            const selected = year === yearGroup
            return (
              <Pressable
                key={year}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`h-11 flex-1 items-center justify-center rounded-md border active:opacity-70 ${
                  selected ? "border-primary bg-primary" : "border-border bg-white"
                }`}
                onPress={() => setYearGroup(year)}
              >
                <Text
                  className={`font-text text-body-lg font-semibold ${
                    selected ? "text-white" : "text-ink"
                  }`}
                >
                  {year}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Birth month / Birth year */}
      <View className="mt-8 flex-row gap-4">
        <View className="flex-1">
          <FieldLabel>Birth month</FieldLabel>
          <Select value={birthMonth} placeholder="Month" onPress={() => setSheet("month")} />
        </View>
        <View className="flex-1">
          <FieldLabel>Birth year</FieldLabel>
          <Select value={birthYear} placeholder="Year" onPress={() => setSheet("year")} />
        </View>
      </View>

      {/* Reassurance */}
      <View className="mt-6 flex-row items-center justify-center gap-2">
        <SymbolView name="shield" size={18} tintColor={colors["text-secondary"]} />
        <Text className="font-text text-body-lg text-text-secondary">
          We only ask for what we need.
        </Text>
      </View>

      <View className="flex-1" />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit }}
        className={`h-13 items-center justify-center rounded-full bg-primary active:opacity-80 ${
          canSubmit ? "" : "opacity-40"
        }`}
        disabled={!canSubmit}
        onPress={onSubmit}
      >
        <Text className="font-text text-field font-bold text-white">
          {saving ? "Saving…" : editing ? "Save changes" : "Add child"}
        </Text>
      </Pressable>

      {/* Delete — edit mode only. Confirmed via an alert; destructive styling. */}
      {editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${existing!.name}`}
          className="mt-3 h-13 flex-row items-center justify-center gap-2 active:opacity-60"
          disabled={deleting}
          onPress={onDelete}
        >
          <SymbolView name="trash" size={18} tintColor={colors.error} />
          <Text className="font-text text-field font-semibold text-error">
            {deleting ? "Deleting…" : "Delete child"}
          </Text>
        </Pressable>
      ) : null}

      <View className="mb-8" />

      {avatarOpen ? (
        <AvatarSheet
          selected={avatar}
          onSelect={(next) => {
            setAvatar(next)
            setAvatarOpen(false)
          }}
          onClose={() => setAvatarOpen(false)}
        />
      ) : null}

      {sheet === "month" ? (
        <PickerSheet
          title="Birth month"
          options={MONTHS}
          selected={birthMonth}
          onSelect={(value) => {
            setBirthMonth(value)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}

      {sheet === "year" ? (
        <PickerSheet
          title="Birth year"
          options={YEARS}
          selected={birthYear}
          onSelect={(value) => {
            setBirthYear(value)
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </SafeAreaView>
  )
}

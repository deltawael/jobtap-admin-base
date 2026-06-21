<script setup lang="ts">
import { brandConfig } from '@/config/brand';

defineOptions({
  name: 'GlobalFooter'
});
</script>

<template>
  <DarkModeContainer class="h-full flex-center">
    <a :href="brandConfig.footer.href" target="_blank" rel="noopener noreferrer">
      {{ brandConfig.footer.text }}
    </a>
  </DarkModeContainer>
</template>

<style scoped></style>
